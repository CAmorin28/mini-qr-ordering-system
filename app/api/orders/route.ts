import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listOrdersFromDb, saveOrderToDb } from "@/lib/db/orders";
import { touchGuestSessionActivity } from "@/lib/db/table-qr-session";
import { requireGuestSessionForApi } from "@/lib/server/guest-session-guard";
import { isGuestQrSecurityEnabled } from "@/lib/shared/guest-qr-security";
import { normalizeTableLetter } from "@/lib/shared/table-session";
import type { PlacedOrder } from "@/types";

function isPlacedOrder(body: unknown): body is PlacedOrder {
  if (!body || typeof body !== "object") return false;
  const o = body as PlacedOrder;
  return (
    typeof o.orderId === "string" &&
    Array.isArray(o.lines) &&
    typeof o.subtotal === "number" &&
    o.customer != null &&
    typeof o.customer.fullName === "string"
  );
}

/** GET /api/orders — active orders for customers (?table=A, active-only by default) */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured", orders: [] },
      { status: 503 },
    );
  }

  const { searchParams } = new URL(request.url);
  const tableLetter = normalizeTableLetter(searchParams.get("table"));
  const includeCompleted = searchParams.get("includeCompleted") === "true";

  if (!tableLetter) {
    return NextResponse.json(
      { error: "Table QR required. Pass ?table=A from your scan.", orders: [] },
      { status: 400 },
    );
  }

  const session = await requireGuestSessionForApi(request, tableLetter);
  if (!session.ok) return session.response;

  try {
    const orders = await listOrdersFromDb({
      activeOnly: !includeCompleted,
      tableLetter,
    });
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json(
      { error: "Failed to load orders" },
      { status: 500 },
    );
  }
}

/** POST /api/orders — create order record after checkout */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isPlacedOrder(body)) {
    return NextResponse.json(
      { error: "Invalid order payload. Send a complete PlacedOrder object." },
      { status: 400 },
    );
  }

  const orderTable = normalizeTableLetter(body.customer.tableLetter);
  if (isGuestQrSecurityEnabled(request.headers.get("host")) && !orderTable) {
    return NextResponse.json(
      {
        error: "Table QR session required to place orders on the live site.",
        code: "guest_session_required",
      },
      { status: 401 },
    );
  }

  const session = await requireGuestSessionForApi(request, orderTable);
  if (!session.ok) return session.response;

  const result = await saveOrderToDb(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await touchGuestSessionActivity(request);

  return NextResponse.json(
    {
      orderId: result.order.orderId,
      message: "Order saved successfully",
      total: result.order.subtotal,
      order: result.order,
    },
    { status: 201 },
  );
}
