import { clearServerGuestSession } from "@/lib/api-guest-session";
import { filterActiveOrders } from "@/lib/order-completion";
import {
  TABLE_SESSION_STORAGE_KEY,
  TABLE_VISIT_ENDED_EVENT,
  activeOrderStorageKey,
  cartStorageKey,
  markTableVisitEnded,
  normalizeTableLetter,
  ordersStorageKey,
  type TableVisitEndedDetail,
} from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

const PENDING_ORDER_KEY = "tablebite_pending_order";

/** Active orders only — completed visits are hidden from the customer. */
export function customerVisibleOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return filterActiveOrders(orders);
}

/** Clear guest cart and order history on this device (walk-in / menu without QR). */
export function clearGuestCustomerSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ordersStorageKey(""));
  localStorage.removeItem(cartStorageKey(""));
  const activeKey = activeOrderStorageKey("");
  localStorage.removeItem(activeKey);
  sessionStorage.removeItem(activeKey);
  sessionStorage.removeItem(PENDING_ORDER_KEY);
}

/** Clear cart, order history, and table QR session for this table (next party must scan again). */
export function clearTableCustomerSession(tableLetter: string): void {
  if (typeof window === "undefined") return;
  const letter = normalizeTableLetter(tableLetter);
  if (!letter) return;
  localStorage.removeItem(ordersStorageKey(letter));
  localStorage.removeItem(cartStorageKey(letter));
  const activeKey = activeOrderStorageKey(letter);
  localStorage.removeItem(activeKey);
  sessionStorage.removeItem(activeKey);
  sessionStorage.removeItem(PENDING_ORDER_KEY);
  sessionStorage.removeItem(TABLE_SESSION_STORAGE_KEY);
  markTableVisitEnded(letter);
  void clearServerGuestSession();
  window.dispatchEvent(
    new CustomEvent<TableVisitEndedDetail>(TABLE_VISIT_ENDED_EVENT, {
      detail: { tableLetter: letter },
    }),
  );
}

function removeOrderFromStorage(order: PlacedOrder): void {
  const letter = normalizeTableLetter(order.customer.tableLetter);
  const key = ordersStorageKey(letter);
  try {
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

/**
 * After an order is completed by staff, drop it from local storage.
 * If no active orders remain for the session, reset customer storage.
 */
export function afterCustomerOrderCompleted(
  order: PlacedOrder,
  remainingActiveForSession: PlacedOrder[],
): void {
  if (typeof window === "undefined") return;

  const letter = normalizeTableLetter(order.customer.tableLetter);
  const remaining = letter
    ? remainingActiveForSession.filter(
        (o) => normalizeTableLetter(o.customer.tableLetter) === letter,
      )
    : remainingActiveForSession.filter(
        (o) => !normalizeTableLetter(o.customer.tableLetter),
      );

  if (remaining.length === 0) {
    if (letter) {
      clearTableCustomerSession(letter);
    } else {
      clearGuestCustomerSession();
    }
    return;
  }

  removeOrderFromStorage(order);
}
