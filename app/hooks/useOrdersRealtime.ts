"use client";

import { useEffect, useRef } from "react";

const DEFAULT_POLL_MS = 30_000;

export type OrdersRealtimeFilter =
  | { mode: "all" }
  | { mode: "table"; tableLetter: string }
  | { mode: "order"; orderId: string }
  | { mode: "orderIds"; orderIds: string[] };

export interface OrdersRealtimeCallbacks {
  onUpsert: (order: import("@/lib/types").PlacedOrder) => void;
  onDelete?: (orderId: string) => void;
}

/**
 * Polls for order updates until MySQL live updates are implemented.
 * `fallbackPoll` should refetch orders from the API.
 */
export function useOrdersRealtime(
  _filter: OrdersRealtimeFilter,
  _callbacks: OrdersRealtimeCallbacks,
  options?: { enabled?: boolean; fallbackPoll?: () => void; pollIntervalMs?: number },
): boolean {
  const enabled = options?.enabled !== false;
  const intervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const pollRef = useRef(options?.fallbackPoll);
  pollRef.current = options?.fallbackPoll;

  useEffect(() => {
    if (!enabled || !pollRef.current) return;

    const timer = window.setInterval(() => {
      pollRef.current?.();
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, intervalMs]);

  return false;
}
