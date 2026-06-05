import "server-only";

import { getOrderFromDb, listOrdersFromDb } from "@/lib/db/orders";
import { subscribeOrderUpdates } from "@/lib/order-realtime-hub";
import { orderSnapshotKey } from "@/lib/order-snapshot";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

export const ORDER_STREAM_POLL_MS = 2_000;
export const ORDER_STREAM_HEARTBEAT_MS = 15_000;

export type OrderStreamFilter =
  | { mode: "order"; orderId: string }
  | { mode: "orderIds"; orderIds: string[] }
  | { mode: "table"; tableLetter: string }
  | { mode: "all" };

function matchesFilter(order: PlacedOrder, filter: OrderStreamFilter): boolean {
  if (filter.mode === "order") {
    return order.orderId === filter.orderId;
  }
  if (filter.mode === "orderIds") {
    return filter.orderIds.includes(order.orderId);
  }
  if (filter.mode === "table") {
    return normalizeTableLetter(order.customer.tableLetter) === filter.tableLetter;
  }
  return true;
}

async function fetchOrdersForFilter(filter: OrderStreamFilter): Promise<PlacedOrder[]> {
  if (filter.mode === "order") {
    const order = await getOrderFromDb(filter.orderId);
    return order ? [order] : [];
  }
  if (filter.mode === "orderIds") {
    const orders = await Promise.all(filter.orderIds.map((id) => getOrderFromDb(id)));
    return orders.filter((order): order is PlacedOrder => order !== null);
  }
  if (filter.mode === "table") {
    return listOrdersFromDb({ tableLetter: filter.tableLetter });
  }
  return listOrdersFromDb();
}

export function createOrderEventStream(
  filter: OrderStreamFilter,
  request: Request,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let closed = false;
  const snapshots = new Map<string, string>();

  const send = (controller: ReadableStreamDefaultController<Uint8Array>, payload: object) => {
    if (closed) return;
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
    } catch {
      closed = true;
    }
  };

  const pushOrder = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    order: PlacedOrder,
  ) => {
    if (!matchesFilter(order, filter)) return;
    const key = orderSnapshotKey(order);
    const prev = snapshots.get(order.orderId);
    if (prev === key) return;
    snapshots.set(order.orderId, key);
    send(controller, { type: "order", order });
  };

  return new ReadableStream({
    async start(controller) {
      const poll = async () => {
        if (closed) return;
        try {
          const orders = await fetchOrdersForFilter(filter);
          for (const order of orders) {
            pushOrder(controller, order);
          }
        } catch {
          /* keep stream alive */
        }
      };

      await poll();

      const unsubscribe = subscribeOrderUpdates((order) => {
        pushOrder(controller, order);
      });

      const pollTimer = setInterval(() => {
        void poll();
      }, ORDER_STREAM_POLL_MS);

      const heartbeatTimer = setInterval(() => {
        send(controller, { type: "heartbeat", at: Date.now() });
      }, ORDER_STREAM_HEARTBEAT_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });
}

export function orderStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
