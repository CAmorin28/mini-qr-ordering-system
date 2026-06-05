import type { OrderStatus, PaymentStatus, PlacedOrder } from "@/lib/types";
import { normalizeTableLetter } from "@/lib/table-session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

async function adminFetch(input: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${input}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  return res;
}

export async function fetchAdminSession(): Promise<{
  configured: boolean;
  authenticated: boolean;
}> {
  const res = await adminFetch("/api/admin/auth", { method: "GET" });
  if (!res.ok) {
    throw new Error("Failed to check admin session");
  }
  return res.json() as Promise<{ configured: boolean; authenticated: boolean }>;
}

export async function adminSignIn(username: string, password: string): Promise<void> {
  const res = await adminFetch("/api/admin/auth", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error ?? "Sign in failed");
  }
}

export async function adminSignOut(): Promise<void> {
  await adminFetch("/api/admin/auth", { method: "DELETE" });
}

export type DatabaseHealth = "not_configured" | "connected" | "error";

export async function fetchDatabaseHealth(): Promise<{
  database: DatabaseHealth;
  message?: string;
}> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
  const data = (await res.json()) as {
    database?: string;
    message?: string;
  };
  if (data.database === "connected") {
    return { database: "connected" };
  }
  if (data.database === "not_configured") {
    return { database: "not_configured" };
  }
  return {
    database: "error",
    message: data.message ?? "Database connection failed",
  };
}

export async function fetchAdminOrders(): Promise<PlacedOrder[]> {
  const res = await adminFetch("/api/admin/orders", { cache: "no-store" });
  const data = await res.json();
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    const err = new Error(data.error ?? "Failed to load orders") as Error & {
      code?: string;
    };
    if (res.status === 503 && data.error === "Database not configured") {
      err.code = "DATABASE_NOT_CONFIGURED";
    }
    throw err;
  }
  return (data as { orders: PlacedOrder[] }).orders ?? [];
}

export async function updateAdminOrder(
  orderId: string,
  updates: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    ready?: boolean;
    completed?: boolean;
  },
): Promise<PlacedOrder> {
  const res = await adminFetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to update order");
  }
  return (data as { order: PlacedOrder }).order;
}

export async function markOrderReadyForCompletion(orderId: string): Promise<PlacedOrder> {
  return updateAdminOrder(orderId, { ready: true });
}

export async function completeAdminOrder(orderId: string): Promise<PlacedOrder> {
  return updateAdminOrder(orderId, { completed: true });
}

export async function openAdminTableVisit(tableLetter: string): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) {
    throw new Error("Enter one table letter (A–Z).");
  }
  const res = await adminFetch("/api/admin/table-visit", {
    method: "POST",
    body: JSON.stringify({ table }),
  });
  const data = await res.json();
  if (res.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!res.ok) {
    throw new Error(data.error ?? "Failed to open table for new guests");
  }
}

export interface AdminTableVisitSummary {
  tableLetter: string;
  visitOpen: boolean;
  hasActiveOrders: boolean;
  canBind: boolean;
  sessionOccupied: boolean;
}

export async function fetchAdminTableVisitSummary(
  tableLetter: string,
): Promise<AdminTableVisitSummary | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  try {
    const res = await adminFetch(
      `/api/admin/table-visit?table=${encodeURIComponent(table)}`,
      { cache: "no-store" },
    );
    if (res.status === 401) {
      throw new Error("UNAUTHORIZED");
    }
    if (!res.ok) return null;
    return (await res.json()) as AdminTableVisitSummary;
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      throw err;
    }
    return null;
  }
}
