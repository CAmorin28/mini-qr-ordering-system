"use client";

import { useEffect, useRef, useState } from "react";
import type { PlacedOrder } from "@/types";

const DEFAULT_POLL_MS = 3_000;
const SSE_RECONNECT_MS = 2_000;

export type OrdersRealtimeFilter =
  | { mode: "all" }
  | { mode: "table"; tableLetter: string }
  | { mode: "order"; orderId: string }
  | { mode: "orderIds"; orderIds: string[] };

export interface OrdersRealtimeCallbacks {
  onUpsert: (order: PlacedOrder) => void;
  onDelete?: (orderId: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

function streamUrl(filter: OrdersRealtimeFilter): string | null {
  if (filter.mode === "order") {
    return `${API_BASE}/api/orders/stream?orderId=${encodeURIComponent(filter.orderId)}`;
  }
  if (filter.mode === "orderIds") {
    if (filter.orderIds.length === 0) return null;
    const qs = filter.orderIds.map((id) => encodeURIComponent(id)).join(",");
    return `${API_BASE}/api/orders/stream?orderIds=${qs}`;
  }
  if (filter.mode === "table") {
    return `${API_BASE}/api/orders/stream?table=${encodeURIComponent(filter.tableLetter)}`;
  }
  if (filter.mode === "all") {
    return `${API_BASE}/api/admin/orders/stream`;
  }
  return null;
}

function filterKey(filter: OrdersRealtimeFilter): string {
  if (filter.mode === "order") return `order:${filter.orderId}`;
  if (filter.mode === "table") return `table:${filter.tableLetter}`;
  if (filter.mode === "orderIds") {
    return `ids:${[...filter.orderIds].sort().join(",")}`;
  }
  return "all";
}

/**
 * Live order updates via SSE (instant on admin save) with HTTP polling fallback.
 */
export function useOrdersRealtime(
  filter: OrdersRealtimeFilter,
  callbacks: OrdersRealtimeCallbacks,
  options?: { enabled?: boolean; fallbackPoll?: () => void; pollIntervalMs?: number },
): boolean {
  const enabled = options?.enabled !== false;
  const intervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_MS;
  const pollRef = useRef(options?.fallbackPoll);
  pollRef.current = options?.fallbackPoll;
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [liveConnected, setLiveConnected] = useState(false);
  const key = filterKey(filter);

  useEffect(() => {
    if (!enabled) {
      setLiveConnected(false);
      return;
    }

    const url = streamUrl(filter);
    if (!url) {
      setLiveConnected(false);
      return;
    }

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      if (stopped) return;
      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        setLiveConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as {
            type?: string;
            order?: PlacedOrder;
          };
          if (data.type === "heartbeat" || !data.order) return;
          callbacksRef.current.onUpsert(data.order);
        } catch {
          /* ignore malformed event */
        }
      };

      es.onerror = () => {
        setLiveConnected(false);
        es?.close();
        es = null;
        if (!stopped) {
          reconnectTimer = setTimeout(connect, SSE_RECONNECT_MS);
        }
      };
    };

    connect();

    return () => {
      stopped = true;
      setLiveConnected(false);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [enabled, key]);

  useEffect(() => {
    if (!enabled || !pollRef.current) return;

    const poll = () => {
      pollRef.current?.();
    };

    poll();

    const pollEvery = liveConnected ? Math.max(intervalMs, 8_000) : intervalMs;
    const timer = window.setInterval(poll, pollEvery);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, liveConnected]);

  return liveConnected;
}
