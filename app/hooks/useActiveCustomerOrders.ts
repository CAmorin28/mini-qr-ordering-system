"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { isCompletedOrder } from "@/lib/order-completion";
import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import {
  applyCustomerOrderUpsert,
  resolveCustomerRealtimeFilter,
} from "@/lib/customer-order-realtime";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { listOrders, saveOrder } from "@/lib/order-history";
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
          if (!isCompletedOrder(order)) {
            saveOrder(order);
          }
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

  const realtimeFilter = useMemo(
    () => resolveCustomerRealtimeFilter(tableLetter, orders),
    [tableLetter, orders],
  );

  useOrdersRealtime(
    realtimeFilter ?? { mode: "orderIds", orderIds: [] },
    {
      onUpsert: (order) => {
        applyCustomerOrderUpsert(
          order,
          {
            tableLetter,
            trackedOrderIds: table ? undefined : trackedGuestOrderIds(ordersRef.current),
          },
          setOrders,
        );
      },
    },
    {
      enabled: realtimeFilter !== null,
      fallbackPoll: load,
      pollIntervalMs: 3_000,
    },
  );

  return { orders, loading, refresh: load };
}
