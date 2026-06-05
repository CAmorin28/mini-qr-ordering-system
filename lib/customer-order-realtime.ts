import type { Dispatch, SetStateAction } from "react";
import type { OrdersRealtimeFilter } from "@/app/hooks/useOrdersRealtime";
import { isCompletedOrder } from "@/lib/order-completion";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { saveOrder } from "@/lib/order-history";
import { mergeOrderIntoList } from "@/lib/orders-merge";
import { applyTableOrderRealtimeUpdate } from "@/lib/sync-table-visit-end";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

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
    return { mode: "table", tableLetter: table };
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
      void applyTableOrderRealtimeUpdate(order, table);
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
