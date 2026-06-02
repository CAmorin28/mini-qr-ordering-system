import type { MenuCategory, MenuItem, OrderPayload, OrderResponse } from "./types";

/** Same-origin on Vercel and `next dev` — uses `/api/*` Route Handlers */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

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
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to place order");
  }
  return data;
}
