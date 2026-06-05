import type { PlacedOrder } from "@/lib/types";

/** Merge or insert an order into a list sorted by createdAt desc. */
export function mergeOrderIntoList(
  list: PlacedOrder[],
  order: PlacedOrder,
): PlacedOrder[] {
  const index = list.findIndex((o) => o.orderId === order.orderId);
  const next = index >= 0 ? [...list] : [order, ...list];
  if (index >= 0) {
    next[index] = order;
  }
  return next.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
