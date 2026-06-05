"use client";

import { useCallback, useEffect } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { isCompletedOrder } from "@/lib/order-completion";
import { saveOrder } from "@/lib/order-history";
import {
  applyTableOrderRealtimeUpdate,
  syncTableVisitEndIfNeeded,
} from "@/lib/sync-table-visit-end";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

/** Clears the table QR session when staff completes the visit (polled). */
export function useTableVisitEndSync(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);

  const run = useCallback(async () => {
    if (!table) return;
    await syncTableVisitEndIfNeeded(table);
  }, [table]);

  useEffect(() => {
    if (!table) return;
    void run();
  }, [table, run]);

  useOrdersRealtime(
    { mode: "table", tableLetter: table },
    {
      onUpsert: (order: PlacedOrder) => {
        if (normalizeTableLetter(order.customer.tableLetter) !== table) return;
        if (isCompletedOrder(order)) {
          void applyTableOrderRealtimeUpdate(order, table);
          return;
        }
        saveOrder(order);
        void applyTableOrderRealtimeUpdate(order, table);
      },
    },
    { enabled: !!table, fallbackPoll: run, pollIntervalMs: 5_000 },
  );
}
