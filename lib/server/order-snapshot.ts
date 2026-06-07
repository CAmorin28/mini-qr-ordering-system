import type { PlacedOrder } from "@/types";

/** Stable key for detecting customer-visible order changes. */
export function orderSnapshotKey(order: PlacedOrder): string {
  return [
    order.status,
    order.paymentStatus,
    order.readyAt ?? "",
    order.completedAt ?? "",
  ].join("|");
}
