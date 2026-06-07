import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getOrderFromDb } from "@/lib/db/orders";
import { requireGuestSessionForApi } from "@/lib/server/guest-session-guard";
import {
  createOrderEventStream,
  orderStreamResponse,
} from "@/lib/server/order-stream";
import { normalizeTableLetter } from "@/lib/shared/table-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_STREAM_ORDER_IDS = 30;

function parseOrderIdsParam(raw: string | null): string[] {
  if (!raw) return [];
  const ids = raw
    .split(",")
    .map((id) => decodeURIComponent(id.trim()))
    .filter(Boolean);
  return [...new Set(ids)].slice(0, MAX_STREAM_ORDER_IDS);
}

async function authorizeOrdersForStream(
  request: Request,
  orders: Awaited<ReturnType<typeof getOrderFromDb>>[],
): Promise<NextResponse | null> {
  const tables = new Set<string>();
  for (const order of orders) {
    if (!order) continue;
    const table = normalizeTableLetter(order.customer.tableLetter);
    if (table) tables.add(table);
  }

  if (tables.size > 1) {
    return NextResponse.json(
      { error: "Orders belong to different tables. Subscribe per table instead." },
      { status: 400 },
    );
  }

  const [table] = tables;
  if (table) {
    const session = await requireGuestSessionForApi(request, table);
    if (!session.ok) return session.response;
  }

  return null;
}

/** GET /api/orders/stream — SSE for live order updates (?table=, ?orderId=, or ?orderIds=a,b) */
export async function GET(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const tableLetter = normalizeTableLetter(searchParams.get("table"));
  const orderId = searchParams.get("orderId")?.trim();
  const orderIds = parseOrderIdsParam(searchParams.get("orderIds"));

  if (!tableLetter && !orderId && orderIds.length === 0) {
    return NextResponse.json(
      { error: "Pass ?table=, ?orderId=, or ?orderIds= to subscribe to order updates." },
      { status: 400 },
    );
  }

  if (tableLetter) {
    const session = await requireGuestSessionForApi(request, tableLetter);
    if (!session.ok) return session.response;
    return orderStreamResponse(
      createOrderEventStream({ mode: "table", tableLetter }, request),
    );
  }

  if (orderIds.length > 0) {
    const orders = await Promise.all(orderIds.map((id) => getOrderFromDb(id)));
    if (orders.every((order) => order === null)) {
      return NextResponse.json({ error: "No matching orders found" }, { status: 404 });
    }
    const denied = await authorizeOrdersForStream(request, orders);
    if (denied) return denied;
    return orderStreamResponse(
      createOrderEventStream({ mode: "orderIds", orderIds }, request),
    );
  }

  const order = await getOrderFromDb(orderId!);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  const denied = await authorizeOrdersForStream(request, [order]);
  if (denied) return denied;

  return orderStreamResponse(
    createOrderEventStream({ mode: "order", orderId: orderId! }, request),
  );
}
