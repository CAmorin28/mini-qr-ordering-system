"use client";

import { useEffect, useRef } from "react";
import { isSupabaseRealtimeConfigured } from "@/lib/supabase/config";
import {
  subscribeOrdersRealtime,
  type OrdersRealtimeCallbacks,
  type OrdersRealtimeFilter,
} from "@/lib/supabase/orders-realtime";

const FALLBACK_POLL_MS = 60_000;

/**
 * Subscribes to Supabase Realtime order changes. Falls back to optional slow poll
 * when Realtime is not configured (missing anon key or SQL migration).
 */
export function useOrdersRealtime(
  filter: OrdersRealtimeFilter,
  callbacks: OrdersRealtimeCallbacks,
  options?: { enabled?: boolean; fallbackPoll?: () => void },
): boolean {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;
  const enabled = options?.enabled !== false;
  const realtimeReady = isSupabaseRealtimeConfigured();

  const tableLetter = filter.mode === "table" ? filter.tableLetter : "";
  const orderId = filter.mode === "order" ? filter.orderId : "";
  const orderIdsKey =
    filter.mode === "orderIds" ? filter.orderIds.slice().sort().join(",") : "";

  useEffect(() => {
    if (!enabled || !realtimeReady) return;

    return subscribeOrdersRealtime(filter, {
      onUpsert: (order) => callbacksRef.current.onUpsert(order),
      onDelete: (orderId) => callbacksRef.current.onDelete?.(orderId),
    });
  }, [enabled, realtimeReady, filter.mode, tableLetter, orderId, orderIdsKey, filter]);

  useEffect(() => {
    if (!enabled || realtimeReady || !options?.fallbackPoll) return;

    const timer = window.setInterval(() => {
      options.fallbackPoll?.();
    }, FALLBACK_POLL_MS);

    return () => window.clearInterval(timer);
  }, [enabled, realtimeReady, options?.fallbackPoll]);

  return realtimeReady;
}
