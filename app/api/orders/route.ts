import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listOrdersFromDb, saveOrderToDb } from "@/lib/supabase/orders";
import type { PlacedOrder } from "@/lib/types";

function isPlacedOrder(body: unknown): body is PlacedOrder {
  if (!body || typeof body !== "object") return false;
  const o = body as PlacedOrder;
  return (
    typeof o.orderId === "string" &&
    Array.isArray(o.lines) &&
    typeof o.subtotal === "number" &&
    o.delivery != null &&
    typeof o.delivery.fullName === "string"
  );
}

/** GET /api/orders — list recent orders */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured", orders: [] },
      { status: 503 },
    );
  }

  try {
    const orders = await listOrdersFromDb();
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
  if (!isSupabaseConfigured()) {
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

  const result = await saveOrderToDb(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

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
