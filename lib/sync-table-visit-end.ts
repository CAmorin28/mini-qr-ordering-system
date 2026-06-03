import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import {
  afterCustomerOrderCompleted,
  clearTableCustomerSession,
} from "@/lib/customer-table-session";
import { isCompletedOrder } from "@/lib/order-completion";
import { getActiveOrderId, listAllStoredOrders } from "@/lib/order-history";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

/**
 * When staff completes a visit, clear the table QR session even if the customer
 * is on the menu (not the confirmation page). Skips browse-only sessions where
 * the guest scanned QR but has not placed an order yet.
 */
export async function syncTableVisitEndIfNeeded(
  tableLetter: string,
): Promise<boolean> {
  const letter = normalizeTableLetter(tableLetter);
  if (!letter || typeof window === "undefined") return false;

  let remaining: PlacedOrder[] = [];
  try {
    const fromApi = await fetchOrderHistory(letter);
    remaining = activePlacedOrdersForTable(fromApi, letter);
  } catch {
    return false;
  }

  if (remaining.length > 0) return false;

  const storedOrders = listAllStoredOrders(letter);
  const activeId = getActiveOrderId(letter);
  if (!activeId && storedOrders.length === 0) return false;

  const idsToCheck = new Set<string>();
  if (activeId) idsToCheck.add(activeId);
  for (const order of storedOrders) idsToCheck.add(order.orderId);

  for (const orderId of idsToCheck) {
    try {
      const latest = await fetchOrderById(orderId);
      if (latest && isCompletedOrder(latest)) {
        afterCustomerOrderCompleted(latest, remaining);
        return true;
      }
    } catch {
      /* try next id */
    }
  }

  if (storedOrders.length > 0 && storedOrders.every(isCompletedOrder)) {
    clearTableCustomerSession(letter);
    return true;
  }

  return false;
}
