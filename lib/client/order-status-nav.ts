import { customerVisibleOrders } from "@/lib/client/customer-table-session";
import {
  checkoutConfirmationPath,
  ORDERS_HISTORY_PATH,
} from "@/lib/shared/menu-url";
import { getActiveOrderId, listOrders } from "@/lib/client/order-history";
import { isPlacedOrder } from "@/lib/client/place-order";
import { normalizeTableLetter } from "@/lib/shared/table-session";
import type { PlacedOrder } from "@/types";

export function activePlacedOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return customerVisibleOrders(orders.filter(isPlacedOrder));
}

/**
 * Active orders for the current customer context.
 * With a table letter: orders for that QR table session.
 * Without: guest orders on this device (no table on the order).
 */
export function activePlacedOrdersForTable(
  orders: PlacedOrder[],
  tableLetter: string,
): PlacedOrder[] {
  const table = normalizeTableLetter(tableLetter);
  const active = activePlacedOrders(orders);
  if (table) {
    return active.filter(
      (o) => normalizeTableLetter(o.customer.tableLetter) === table,
    );
  }
  return active.filter((o) => !normalizeTableLetter(o.customer.tableLetter));
}

/** Where to send the customer for live status + receipt (step 3). */
export function resolveOrderStatusHref(
  orders: PlacedOrder[],
  tableLetter: string,
  pathWithSession: (path: string) => string,
): string | null {
  const table = normalizeTableLetter(tableLetter);
  const active = activePlacedOrdersForTable(orders, tableLetter);
  if (active.length === 1) {
    return pathWithSession(checkoutConfirmationPath(active[0].orderId));
  }
  if (active.length > 1) {
    return pathWithSession(ORDERS_HISTORY_PATH);
  }

  const activeId = getActiveOrderId(table);
  if (activeId) {
    const localMatch = listOrders(table).find((o) => o.orderId === activeId);
    if (
      localMatch &&
      activePlacedOrdersForTable([localMatch], tableLetter).length === 1
    ) {
      return pathWithSession(checkoutConfirmationPath(activeId));
    }
  }

  const local = activePlacedOrdersForTable(listOrders(table), tableLetter);
  if (local.length === 1) {
    return pathWithSession(checkoutConfirmationPath(local[0].orderId));
  }
  if (local.length > 1) {
    return pathWithSession(ORDERS_HISTORY_PATH);
  }

  return null;
}
