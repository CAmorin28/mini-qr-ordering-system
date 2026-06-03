import { filterActiveOrders } from "@/lib/order-completion";
import {
  activeOrderStorageKey,
  cartStorageKey,
  normalizeTableLetter,
  ordersStorageKey,
} from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

/** Active orders only — completed visits are hidden from the customer. */
export function customerVisibleOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return filterActiveOrders(orders);
}

/** Clear cart and order history on this device for a table (next party gets a fresh session). */
export function clearTableCustomerSession(tableLetter: string): void {
  if (typeof window === "undefined") return;
  const letter = normalizeTableLetter(tableLetter);
  if (!letter) return;
  localStorage.removeItem(ordersStorageKey(letter));
  localStorage.removeItem(cartStorageKey(letter));
  const activeKey = activeOrderStorageKey(letter);
  localStorage.removeItem(activeKey);
  sessionStorage.removeItem(activeKey);
}

/**
 * After an order is completed by staff, drop it from local storage.
 * If no active orders remain for the table, reset the whole customer session.
 */
export function afterCustomerOrderCompleted(
  order: PlacedOrder,
  remainingActiveForTable: PlacedOrder[],
): void {
  const letter = normalizeTableLetter(order.customer.tableLetter);
  if (!letter || typeof window === "undefined") return;

  if (remainingActiveForTable.length === 0) {
    clearTableCustomerSession(letter);
    return;
  }

  try {
    const key = ordersStorageKey(letter);
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const parsed = JSON.parse(raw) as PlacedOrder[];
    if (!Array.isArray(parsed)) return;
    const next = parsed.filter((o) => o.orderId !== order.orderId);
    if (next.length === 0) {
      localStorage.removeItem(key);
      const activeKey = activeOrderStorageKey(letter);
      localStorage.removeItem(activeKey);
      sessionStorage.removeItem(activeKey);
    } else {
      localStorage.setItem(key, JSON.stringify(next));
    }
  } catch {
    /* ignore */
  }
}
