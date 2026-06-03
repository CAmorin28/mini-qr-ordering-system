import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import {
  afterCustomerOrderCompleted,
  clearTableCustomerSession,
} from "@/lib/customer-table-session";
import { isCompletedOrder } from "@/lib/order-completion";
import { getActiveOrderId, listAllStoredOrders } from "@/lib/order-history";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import {
  TABLE_SESSION_STORAGE_KEY,
  normalizeTableLetter,
} from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

async function anyOrderStillActiveOnServer(
  orderIds: Iterable<string>,
): Promise<boolean> {
  for (const orderId of orderIds) {
    try {
      const latest = await fetchOrderById(orderId);
      if (latest && !isCompletedOrder(latest)) {
        return true;
      }
    } catch {
      /* try next */
    }
  }
  return false;
}

/**
 * When staff completes a visit, clear the table QR session even if the customer
 * is on the menu (not the confirmation page). Uses the API as source of truth
 * so stale local storage does not keep the session alive.
 */
export async function syncTableVisitEndIfNeeded(
  tableLetter: string,
): Promise<boolean> {
  const letter = normalizeTableLetter(tableLetter);
  if (!letter || typeof window === "undefined") return false;

  let apiOrders: PlacedOrder[] = [];
  try {
    apiOrders = await fetchOrderHistory(letter);
  } catch {
    return false;
  }

  const remaining = activePlacedOrdersForTable(apiOrders, letter);
  if (remaining.length > 0) return false;

  const storedOrders = listAllStoredOrders(letter);
  const activeId = getActiveOrderId(letter);
  const hasTableSession =
    normalizeTableLetter(sessionStorage.getItem(TABLE_SESSION_STORAGE_KEY)) ===
    letter;

  const idsToVerify = new Set<string>();
  if (activeId) idsToVerify.add(activeId);
  for (const order of storedOrders) {
    if (normalizeTableLetter(order.customer.tableLetter) === letter) {
      idsToVerify.add(order.orderId);
    }
  }

  if (idsToVerify.size > 0) {
    if (await anyOrderStillActiveOnServer(idsToVerify)) return false;

    for (const orderId of idsToVerify) {
      try {
        const latest = await fetchOrderById(orderId);
        if (latest) {
          afterCustomerOrderCompleted(latest, remaining);
          return true;
        }
      } catch {
        /* try next */
      }
    }
  }

  if (hasTableSession || storedOrders.length > 0 || activeId) {
    clearTableCustomerSession(letter);
    return true;
  }

  return false;
}
