"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchOrderHistory } from "@/lib/api";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { listOrders } from "@/lib/order-history";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

const POLL_MS = 8000;

export function useActiveCustomerOrders(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!table) {
      setOrders([]);
      return;
    }
    try {
      const fromApi = await fetchOrderHistory(table);
      setOrders(activePlacedOrdersForTable(fromApi, table));
    } catch {
      setOrders(activePlacedOrdersForTable(listOrders(table), table));
    }
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

  useEffect(() => {
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  return { orders, loading, refresh: load };
}
