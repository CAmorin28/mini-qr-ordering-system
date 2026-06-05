import type {
  MenuCategory,
  MenuItem,
  OrderPayload,
  OrderResponse,
  PlacedOrder,
} from "./types";
import { guestSessionBoundToTable } from "./api-guest-session";
import { normalizeTableLetter } from "./table-session";

/** Same-origin on Vercel and `next dev` — uses `/api/*` Route Handlers */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export async function fetchProducts(
  category: MenuCategory = "all",
): Promise<MenuItem[]> {
  const params = new URLSearchParams({ category });
  const res = await fetch(`${API_BASE}/api/products?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load products");
  }
  const data = (await res.json()) as { products: MenuItem[] };
  return data.products;
}

export async function fetchMenu(
  category: MenuCategory = "all",
): Promise<MenuItem[]> {
  const params = new URLSearchParams({ category });
  const res = await fetch(`${API_BASE}/api/menu?${params}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("Failed to load menu");
  }
  const data = (await res.json()) as { items: MenuItem[] };
  return data.items;
}

export async function submitOrder(
  payload: OrderPayload,
): Promise<OrderResponse & { total: number }> {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to place order");
  }
  return data;
}

export async function submitPlacedOrder(
  order: PlacedOrder,
): Promise<OrderResponse & { total: number }> {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to save order");
  }
  return data;
}

export async function fetchOrderById(orderId: string): Promise<PlacedOrder | null> {
  const res = await fetch(
    `${API_BASE}/api/orders/${encodeURIComponent(orderId)}`,
    { cache: "no-store", credentials: "include" },
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error("Failed to load order");
  }
  const data = (await res.json()) as { order: PlacedOrder };
  return data.order;
}

export async function fetchOrderHistory(tableLetter = ""): Promise<PlacedOrder[]> {
  const params = new URLSearchParams();
  const table = normalizeTableLetter(tableLetter);
  if (table) {
    const bound = await guestSessionBoundToTable(table);
    if (!bound) {
      return [];
    }
    params.set("table", table);
  }
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/api/orders${qs ? `?${qs}` : ""}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (res.status === 403) {
    return [];
  }
  if (!res.ok) {
    throw new Error("Failed to load order history");
  }
  const data = (await res.json()) as { orders: PlacedOrder[] };
  return data.orders ?? [];
}

export async function cancelOrderById(orderId: string): Promise<PlacedOrder> {
  const res = await fetch(
    `${API_BASE}/api/orders/${encodeURIComponent(orderId)}`,
    { method: "DELETE", credentials: "include" },
  );
  const data = (await res.json()) as { order?: PlacedOrder; error?: string };
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to cancel order");
  }
  if (!data.order) {
    throw new Error("Failed to cancel order");
  }
  return data.order;
}
