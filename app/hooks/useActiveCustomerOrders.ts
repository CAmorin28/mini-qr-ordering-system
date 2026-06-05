"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import { isCompletedOrder } from "@/lib/order-completion";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { listOrders, saveOrder } from "@/lib/order-history";
import { applyTableOrderRealtimeUpdate } from "@/lib/sync-table-visit-end";
import { mergeOrderIntoList } from "@/lib/orders-merge";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

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
    saveOrder(order);
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

  const load = useCallback(async () => {
    if (table) {
      try {
        const fromApi = await fetchOrderHistory(table);
        for (const order of fromApi) {
          saveOrder(order);
        }
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
        if (table) {
          if (isCompletedOrder(order)) {
            void applyTableOrderRealtimeUpdate(order, table);
            setOrders((prev) =>
              activePlacedOrdersForTable(
                prev.filter((o) => o.orderId !== order.orderId),
                table,
              ),
            );
            return;
          }
          saveOrder(order);
          setOrders((prev) =>
            activePlacedOrdersForTable(mergeOrderIntoList(prev, order), table),
          );
          return;
        }
        if (isCompletedOrder(order)) {
          setOrders((prev) => prev.filter((o) => o.orderId !== order.orderId));
          return;
        }
        saveOrder(order);
        const tracked = trackedGuestOrderIds(ordersRef.current);
        if (!tracked.has(order.orderId)) return;
        setOrders((prev) =>
          activePlacedOrdersForTable(mergeOrderIntoList(prev, order), ""),
        );
      },
    },
    { enabled: true, fallbackPoll: load, pollIntervalMs: 5_000 },
  );

  return { orders, loading, refresh: load };
}
