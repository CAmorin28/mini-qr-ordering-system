import { fetchOrderById, fetchOrderHistory } from "@/lib/client/api";
import { guestSessionBoundToTable } from "@/lib/client/api-guest-session";
import {
  afterCustomerOrderCompleted,
  clearStaleTableOrderStorage,
} from "@/lib/client/customer-table-session";
import { isCompletedOrder } from "@/lib/shared/order-completion";
import {
  getActiveOrderId,
  listAllStoredOrders,
  listOrders,
} from "@/lib/client/order-history";
import { activePlacedOrdersForTable } from "@/lib/client/order-status-nav";
import { normalizeTableLetter } from "@/lib/shared/table-session";
import type { PlacedOrder } from "@/types";

/** True when this device is tracking the order (not old history from the stream). */
export function isTrackedTableOrder(order: PlacedOrder, tableLetter: string): boolean {
  const letter = normalizeTableLetter(tableLetter);
  if (!letter || normalizeTableLetter(order.customer.tableLetter) !== letter) {
    return false;
  }
  const activeId = getActiveOrderId(letter);
  if (activeId && activeId === order.orderId) return true;
  return listAllStoredOrders(letter).some((stored) => stored.orderId === order.orderId);
}

/**
 * Apply a realtime/API order update for a table QR session (menu page, etc.).
 * Completed orders clear local storage when no active orders remain for that table.
 */
export async function applyTableOrderRealtimeUpdate(
  order: PlacedOrder,
  tableLetter: string,
): Promise<void> {
  const letter = normalizeTableLetter(tableLetter);
  if (!letter || !isTrackedTableOrder(order, letter)) {
    return;
  }

  if (!isCompletedOrder(order)) {
    return;
  }

  let remaining: PlacedOrder[] = [];
  try {
    const fromApi = await fetchOrderHistory(letter);
    remaining = activePlacedOrdersForTable(fromApi, letter);
  } catch {
    await syncTableVisitEndIfNeeded(letter);
    return;
  }
  afterCustomerOrderCompleted(order, remaining);
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
 * When staff completes a visit, clear stale local order data.
 * Does not end the QR device session — that only happens when staff closes the table.
 */
export async function syncTableVisitEndIfNeeded(
  tableLetter: string,
): Promise<boolean> {
  const letter = normalizeTableLetter(tableLetter);
  if (!letter || typeof window === "undefined") return false;
  if (!(await guestSessionBoundToTable(letter))) return false;

  let apiOrders: PlacedOrder[] = [];
  try {
    apiOrders = await fetchOrderHistory(letter);
  } catch {
    return false;
  }

  const remaining = activePlacedOrdersForTable(apiOrders, letter);
  if (remaining.length > 0) return false;

  const storedActive = listOrders(letter);
  const activeId = getActiveOrderId(letter);

  if (storedActive.length === 0) {
    if (activeId) {
      clearStaleTableOrderStorage(letter);
    }
    return false;
  }

  const idsToVerify = new Set<string>();
  for (const order of storedActive) {
    idsToVerify.add(order.orderId);
  }
  if (activeId) idsToVerify.add(activeId);

  if (await anyOrderStillActiveOnServer(idsToVerify)) return false;

  for (const orderId of idsToVerify) {
    try {
      const latest = await fetchOrderById(orderId);
      if (latest && isCompletedOrder(latest) && isTrackedTableOrder(latest, letter)) {
        afterCustomerOrderCompleted(latest, remaining);
        return true;
      }
    } catch {
      /* try next */
    }
  }

  clearStaleTableOrderStorage(letter);
  return false;
}
