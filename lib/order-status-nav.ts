import { customerVisibleOrders } from "@/lib/customer-table-session";
import {
  checkoutConfirmationPath,
  ORDERS_HISTORY_PATH,
} from "@/lib/menu-url";
import { getActiveOrderId, listOrders } from "@/lib/order-history";
import { isPlacedOrder } from "@/lib/place-order";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

export function activePlacedOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return customerVisibleOrders(orders.filter(isPlacedOrder));
}

/** Active placed orders that belong to the current table QR session only. */
export function activePlacedOrdersForTable(
  orders: PlacedOrder[],
  tableLetter: string,
): PlacedOrder[] {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return [];
  return activePlacedOrders(orders).filter(
    (o) => normalizeTableLetter(o.customer.tableLetter) === table,
  );
}

/** Where to send the customer for live status + receipt (step 3). */
export function resolveOrderStatusHref(
  orders: PlacedOrder[],
  tableLetter: string,
  pathWithSession: (path: string) => string,
): string | null {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  const active = activePlacedOrdersForTable(orders, table);
  if (active.length === 1) {
    return pathWithSession(checkoutConfirmationPath(active[0].orderId));
  }
  if (active.length > 1) {
    return pathWithSession(ORDERS_HISTORY_PATH);
  }

  const activeId = getActiveOrderId(table);
  if (activeId) {
    const localMatch = listOrders(table).find((o) => o.orderId === activeId);
    if (localMatch && activePlacedOrdersForTable([localMatch], table).length === 1) {
      return pathWithSession(checkoutConfirmationPath(activeId));
    }
  }

  const local = activePlacedOrdersForTable(listOrders(table), table);
  if (local.length === 1) {
    return pathWithSession(checkoutConfirmationPath(local[0].orderId));
  }
  if (local.length > 1) {
    return pathWithSession(ORDERS_HISTORY_PATH);
  }

  return null;
}
