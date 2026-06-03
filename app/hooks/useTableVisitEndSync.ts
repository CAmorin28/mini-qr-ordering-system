"use client";

import { useEffect } from "react";
import { syncTableVisitEndIfNeeded } from "@/lib/sync-table-visit-end";
import { normalizeTableLetter } from "@/lib/table-session";

const POLL_MS = 8000;

/** Polls the server and clears the table QR session after staff completes the visit. */
export function useTableVisitEndSync(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);

  useEffect(() => {
    if (!table) return;

    let cancelled = false;

    async function run() {
      if (cancelled) return;
      await syncTableVisitEndIfNeeded(table);
    }

    void run();
    const timer = window.setInterval(() => {
      void run();
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [table]);
}
