"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseRealtimeConfigured } from "@/lib/supabase/config";
import { mapOrderRow } from "@/lib/supabase/order-mapper";
import type { PlacedOrder } from "@/lib/types";
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

export type OrdersRealtimeFilter =
  | { mode: "all" }
  | { mode: "table"; tableLetter: string }
  | { mode: "order"; orderId: string }
  | { mode: "orderIds"; orderIds: string[] };

export interface OrdersRealtimeCallbacks {
  onUpsert: (order: PlacedOrder) => void;
  onDelete?: (orderId: string) => void;
}

function matchesFilter(order: PlacedOrder, filter: OrdersRealtimeFilter): boolean {
  switch (filter.mode) {
    case "all":
      return true;
    case "table": {
      const t = filter.tableLetter.trim().toUpperCase();
      return order.customer.tableLetter.trim().toUpperCase() === t;
    }
    case "order":
      return order.orderId === filter.orderId;
    case "orderIds":
      return filter.orderIds.length > 0 && filter.orderIds.includes(order.orderId);
    default:
      return false;
  }
}

function shouldHandleDelete(orderId: string, filter: OrdersRealtimeFilter): boolean {
  switch (filter.mode) {
    case "all":
      return true;
    case "order":
      return filter.orderId === orderId;
    case "orderIds":
      return filter.orderIds.includes(orderId);
    case "table":
      return true;
    default:
      return false;
  }
}

function handlePayload(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  filter: OrdersRealtimeFilter,
  callbacks: OrdersRealtimeCallbacks,
): void {
  if (payload.eventType === "DELETE") {
    const orderId = (payload.old as { order_id?: string } | undefined)?.order_id;
    if (orderId && shouldHandleDelete(orderId, filter)) {
      callbacks.onDelete?.(orderId);
    }
    return;
  }

  const row = payload.new;
  if (!row?.order_id) return;

  const order = mapOrderRow(row);
  if (matchesFilter(order, filter)) {
    callbacks.onUpsert(order);
  }
}

/** Merge or insert an order into a list sorted by createdAt desc. */
export function mergeOrderIntoList(
  list: PlacedOrder[],
  order: PlacedOrder,
): PlacedOrder[] {
  const index = list.findIndex((o) => o.orderId === order.orderId);
  const next = index >= 0 ? [...list] : [order, ...list];
  if (index >= 0) {
    next[index] = order;
  }
  return next.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function subscribeOrdersRealtime(
  filter: OrdersRealtimeFilter,
  callbacks: OrdersRealtimeCallbacks,
): () => void {
  const supabase = getSupabaseBrowser();
  if (!supabase || !isSupabaseRealtimeConfigured()) {
    return () => {};
  }

  const postgresConfig: {
    event: "*";
    schema: "public";
    table: "orders";
    filter?: string;
  } = {
    event: "*",
    schema: "public",
    table: "orders",
  };

  if (filter.mode === "table" && filter.tableLetter.trim()) {
    postgresConfig.filter = `table_number=eq.${filter.tableLetter.trim().toUpperCase()}`;
  } else if (filter.mode === "order") {
    postgresConfig.filter = `order_id=eq.${filter.orderId}`;
  }

  const channelName = `orders-${filter.mode}-${Math.random().toString(36).slice(2, 9)}`;

  const channel: RealtimeChannel = supabase
    .channel(channelName)
    .on("postgres_changes", postgresConfig, (payload) => {
      handlePayload(
        payload as RealtimePostgresChangesPayload<Record<string, unknown>>,
        filter,
        callbacks,
      );
    })
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
