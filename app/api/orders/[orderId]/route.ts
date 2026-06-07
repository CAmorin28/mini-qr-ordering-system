import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { cancelOrderInDb, getOrderFromDb } from "@/lib/db/orders";
import { requireGuestSessionForApi } from "@/lib/server/guest-session-guard";
import { normalizeTableLetter } from "@/lib/shared/table-session";

/** GET /api/orders/:orderId — single order by client order id */
export async function GET(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const id = decodeURIComponent(orderId);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    const order = await getOrderFromDb(id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const table = normalizeTableLetter(order.customer.tableLetter);
    if (table) {
      const session = await requireGuestSessionForApi(request, table);
      if (!session.ok) return session.response;
    }

    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}

/** DELETE /api/orders/:orderId — customer cancels before kitchen preparation starts */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await context.params;
  const id = decodeURIComponent(orderId);

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const existing = await getOrderFromDb(id);
  if (!existing) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const table = normalizeTableLetter(existing.customer.tableLetter);
  if (table) {
    const session = await requireGuestSessionForApi(request, table);
    if (!session.ok) return session.response;
  }

  const result = await cancelOrderInDb(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ order: result.order });
}
