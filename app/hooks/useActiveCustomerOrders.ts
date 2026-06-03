"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { listOrders, saveOrder } from "@/lib/order-history";
import { isSupabaseRealtimeConfigured } from "@/lib/supabase/config";
import { mergeOrderIntoList } from "@/lib/supabase/orders-realtime";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

const FALLBACK_POLL_MS = 30_000;

async function refreshGuestOrdersFromApi(local: PlacedOrder[]): Promise<PlacedOrder[]> {
  const active = activePlacedOrdersForTable(local, "");
  if (active.length === 0) return local;

  const refreshed = await Promise.all(
    active.map(async (o) => {
      try {
        return (await fetchOrderById(o.orderId)) ?? o;
      } catch {
        return o;
      }
    }),
  );

  const byId = new Map(local.map((o) => [o.orderId, o]));
  for (const order of refreshed) {
    byId.set(order.orderId, order);
  }
  return [...byId.values()];
}

function trackedGuestOrderIds(current: PlacedOrder[]): Set<string> {
  const ids = new Set(current.map((o) => o.orderId));
  for (const o of activePlacedOrdersForTable(listOrders(""), "")) {
    ids.add(o.orderId);
  }
  return ids;
}

export function useActiveCustomerOrders(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const [loading, setLoading] = useState(true);
  const realtimeOn = isSupabaseRealtimeConfigured();

  const load = useCallback(async () => {
    if (table) {
      try {
        const fromApi = await fetchOrderHistory(table);
        setOrders(activePlacedOrdersForTable(fromApi, table));
      } catch {
        setOrders(activePlacedOrdersForTable(listOrders(table), table));
      }
      return;
    }

    let local = listOrders("");
    try {
      local = await refreshGuestOrdersFromApi(local);
    } catch {
      /* keep local */
    }
    setOrders(activePlacedOrdersForTable(local, ""));
  }, [table]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const realtimeFilter = table
    ? ({ mode: "table" as const, tableLetter: table })
    : ({ mode: "all" as const });

  useOrdersRealtime(
    realtimeFilter,
    {
      onUpsert: (order) => {
        saveOrder(order);
        if (table) {
          setOrders((prev) =>
            activePlacedOrdersForTable(mergeOrderIntoList(prev, order), table),
          );
          return;
        }
        const tracked = trackedGuestOrderIds(ordersRef.current);
        if (!tracked.has(order.orderId)) return;
        setOrders((prev) =>
          activePlacedOrdersForTable(mergeOrderIntoList(prev, order), ""),
        );
      },
    },
    { enabled: true, fallbackPoll: load },
  );

  useEffect(() => {
    if (realtimeOn) return;
    const timer = window.setInterval(() => {
      void load();
    }, FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [realtimeOn, load]);

  return { orders, loading, refresh: load };
}
