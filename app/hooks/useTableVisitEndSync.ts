"use client";

import { useCallback, useEffect } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { isSupabaseRealtimeConfigured } from "@/lib/supabase/config";
import { syncTableVisitEndIfNeeded } from "@/lib/sync-table-visit-end";
import { normalizeTableLetter } from "@/lib/table-session";

const FALLBACK_POLL_MS = 30_000;

/** Clears the table QR session when staff completes the visit (realtime or slow poll). */
export function useTableVisitEndSync(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);
  const realtimeOn = isSupabaseRealtimeConfigured();

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
      onUpsert: () => {
        void run();
      },
    },
    { enabled: !!table, fallbackPoll: run },
  );

  useEffect(() => {
    if (!table || realtimeOn) return;
    const timer = window.setInterval(() => {
      void run();
    }, FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [table, realtimeOn, run]);
}
