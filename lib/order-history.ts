import { customerVisibleOrders } from "@/lib/customer-table-session";
import type { PlacedOrder } from "@/lib/types";
import {
  activeOrderStorageKey,
  normalizeTableLetter,
  ordersStorageKey,
} from "@/lib/table-session";

const PENDING_KEY = "tablebite_pending_order";

function readAll(tableLetter = ""): PlacedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ordersStorageKey(tableLetter));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlacedOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(orders: PlacedOrder[], tableLetter = ""): void {
  localStorage.setItem(ordersStorageKey(tableLetter), JSON.stringify(orders));
}

export function saveOrder(order: PlacedOrder): void {
  const tableLetter = normalizeTableLetter(order.customer.tableLetter);
  const orders = readAll(tableLetter).filter((o) => o.orderId !== order.orderId);
  orders.unshift(order);
  writeAll(orders.slice(0, 50), tableLetter);
  setActiveOrderId(order.orderId, tableLetter);
}

export function getOrder(orderId: string, tableLetter = ""): PlacedOrder | null {
  const letter = normalizeTableLetter(tableLetter);
  const fromTable = readAll(letter).find((o) => o.orderId === orderId);
  if (fromTable) return fromTable;
  if (letter) return null;
  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith("tablebite_orders_")) continue;
    const match = readAll(key.replace("tablebite_orders_", "")).find(
      (o) => o.orderId === orderId,
    );
    if (match) return match;
  }
  return null;
}

export function listOrders(tableLetter = ""): PlacedOrder[] {
  return customerVisibleOrders(readAll(normalizeTableLetter(tableLetter)));
}

export function setActiveOrderId(orderId: string, tableLetter = ""): void {
  if (typeof window === "undefined") return;
  const key = activeOrderStorageKey(tableLetter);
  localStorage.setItem(key, orderId);
  sessionStorage.setItem(key, orderId);
}

export function getActiveOrderId(tableLetter = ""): string | null {
  if (typeof window === "undefined") return null;
  const key = activeOrderStorageKey(tableLetter);
  return localStorage.getItem(key) ?? sessionStorage.getItem(key);
}

/** Stash order before navigation so confirmation loads immediately (avoids cart-clear race). */
export function setPendingOrder(order: PlacedOrder): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(order));
}

export function consumePendingOrder(orderId: string): PlacedOrder | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const order = JSON.parse(raw) as PlacedOrder;
    if (order.orderId !== orderId) return null;
    sessionStorage.removeItem(PENDING_KEY);
    return order;
  } catch {
    return null;
  }
}

export function resolveOrder(orderId: string, tableLetter = ""): PlacedOrder | null {
  return consumePendingOrder(orderId) ?? getOrder(orderId, tableLetter);
}
