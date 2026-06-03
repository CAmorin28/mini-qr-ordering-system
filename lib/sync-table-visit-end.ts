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
 * Apply a realtime/API order update for a table QR session (menu page, etc.).
 * Completed orders clear the session when no active orders remain for that table.
 */
export async function applyTableOrderRealtimeUpdate(
  order: PlacedOrder,
  tableLetter: string,
): Promise<void> {
  const letter = normalizeTableLetter(tableLetter);
  if (!letter || normalizeTableLetter(order.customer.tableLetter) !== letter) {
    return;
  }

  if (isCompletedOrder(order)) {
    let remaining: PlacedOrder[] = [];
    try {
      const fromApi = await fetchOrderHistory(letter);
      remaining = activePlacedOrdersForTable(fromApi, letter);
    } catch {
      await syncTableVisitEndIfNeeded(letter);
      return;
    }
    afterCustomerOrderCompleted(order, remaining);
    return;
  }

  await syncTableVisitEndIfNeeded(letter);
}

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

  // QR scan only — guest has not placed an order yet; keep table session.
  if (!activeId && storedOrders.length === 0) {
    return false;
  }

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

  clearTableCustomerSession(letter);
  return true;
}
