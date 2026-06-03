import { customerVisibleOrders } from "@/lib/customer-table-session";
import {
  checkoutConfirmationPath,
  ORDERS_HISTORY_PATH,
} from "@/lib/menu-url";
import { getActiveOrderId, listOrders } from "@/lib/order-history";
import { isPlacedOrder } from "@/lib/place-order";
import type { PlacedOrder } from "@/lib/types";

export function activePlacedOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return customerVisibleOrders(orders.filter(isPlacedOrder));
}

/** Where to send the customer for live status + receipt (step 3). */
export function resolveOrderStatusHref(
  orders: PlacedOrder[],
  tableLetter: string,
  pathWithSession: (path: string) => string,
): string | null {
  const active = activePlacedOrders(orders);
  if (active.length === 1) {
    return pathWithSession(checkoutConfirmationPath(active[0].orderId));
  }
  if (active.length > 1) {
    return pathWithSession(ORDERS_HISTORY_PATH);
  }

  const activeId = getActiveOrderId(tableLetter);
  if (activeId) {
    return pathWithSession(checkoutConfirmationPath(activeId));
  }

  const local = activePlacedOrders(listOrders(tableLetter));
  if (local.length === 1) {
    return pathWithSession(checkoutConfirmationPath(local[0].orderId));
  }
  if (local.length > 1) {
    return pathWithSession(ORDERS_HISTORY_PATH);
  }

  return null;
}
