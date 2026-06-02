import type { PlacedOrder } from "@/lib/types";

const STORAGE_KEY = "tablebite_orders";
const PENDING_KEY = "tablebite_pending_order";

function readAll(): PlacedOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlacedOrder[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(orders: PlacedOrder[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export function saveOrder(order: PlacedOrder): void {
  const orders = readAll().filter((o) => o.orderId !== order.orderId);
  orders.unshift(order);
  writeAll(orders.slice(0, 50));
}

export function getOrder(orderId: string): PlacedOrder | null {
  return readAll().find((o) => o.orderId === orderId) ?? null;
}

export function listOrders(): PlacedOrder[] {
  return readAll();
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

export function resolveOrder(orderId: string): PlacedOrder | null {
  return consumePendingOrder(orderId) ?? getOrder(orderId);
}
