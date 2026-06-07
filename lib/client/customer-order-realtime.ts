import type { Dispatch, SetStateAction } from "react";
import type { OrdersRealtimeFilter } from "@/hooks/useOrdersRealtime";
import { isCompletedOrder } from "@/lib/shared/order-completion";
import { activePlacedOrdersForTable } from "@/lib/client/order-status-nav";
import { saveOrder } from "@/lib/client/order-history";
import { mergeOrderIntoList } from "@/lib/server/orders-merge";
import { applyTableOrderRealtimeUpdate, isTrackedTableOrder } from "@/lib/client/sync-table-visit-end";
import { normalizeTableLetter } from "@/lib/shared/table-session";
import type { PlacedOrder } from "@/types";

const MAX_TRACKED_ORDER_IDS = 30;

/**
 * SSE filter for the current customer context.
 * - Table QR: one stream for every active order at that table.
 * - Walk-in: one order or a combined stream for multiple orders on this device.
 */
export function resolveCustomerRealtimeFilter(
  tableLetter: string,
  orders: PlacedOrder[],
): OrdersRealtimeFilter | null {
  const table = normalizeTableLetter(tableLetter);
  if (table) {
    const active = activePlacedOrdersForTable(orders, table);
    if (active.length === 0) return null;
    if (active.length === 1) {
      return { mode: "order", orderId: active[0].orderId };
    }
    const orderIds = active.map((o) => o.orderId).slice(0, MAX_TRACKED_ORDER_IDS);
    return { mode: "orderIds", orderIds };
  }

  const active = activePlacedOrdersForTable(orders, "");
  if (active.length === 0) return null;
  if (active.length === 1) {
    return { mode: "order", orderId: active[0].orderId };
  }

  const orderIds = active.map((o) => o.orderId).slice(0, MAX_TRACKED_ORDER_IDS);
  return { mode: "orderIds", orderIds };
}

export type CustomerOrdersUpsertContext = {
  tableLetter: string;
  trackedOrderIds?: Set<string>;
};

/** Apply a live order update to customer order lists (single or many). */
export function applyCustomerOrderUpsert(
  order: PlacedOrder,
  context: CustomerOrdersUpsertContext,
  setOrders: Dispatch<SetStateAction<PlacedOrder[]>>,
  options?: { onDatabaseSource?: () => void },
): void {
  const table = normalizeTableLetter(context.tableLetter);

  if (table) {
    if (isCompletedOrder(order)) {
      if (isTrackedTableOrder(order, table)) {
        void applyTableOrderRealtimeUpdate(order, table);
      }
      setOrders((prev) =>
        activePlacedOrdersForTable(
          prev.filter((o) => o.orderId !== order.orderId),
          table,
        ),
      );
      options?.onDatabaseSource?.();
      return;
    }
    saveOrder(order);
    setOrders((prev) =>
      activePlacedOrdersForTable(mergeOrderIntoList(prev, order), table),
    );
    options?.onDatabaseSource?.();
    return;
  }

  if (isCompletedOrder(order)) {
    setOrders((prev) => prev.filter((o) => o.orderId !== order.orderId));
    return;
  }

  if (!context.trackedOrderIds?.has(order.orderId)) return;

  saveOrder(order);
  setOrders((prev) =>
    activePlacedOrdersForTable(mergeOrderIntoList(prev, order), ""),
  );
}
