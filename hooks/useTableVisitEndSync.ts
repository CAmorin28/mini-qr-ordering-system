"use client";

import { useCallback, useEffect } from "react";
import { guestSessionBoundToTable } from "@/lib/client/api-guest-session";
import { fetchTableVisitStatus } from "@/lib/client/api-table-visit";
import { clearTableCustomerSession } from "@/lib/client/customer-table-session";
import { syncTableVisitEndIfNeeded } from "@/lib/client/sync-table-visit-end";
import { normalizeTableLetter } from "@/lib/shared/table-session";

const POLL_INTERVAL_MS = 5_000;

/** Clears the table QR session when staff closes the visit (polled). */
export function useTableVisitEndSync(tableLetter: string) {
  const table = normalizeTableLetter(tableLetter);

  const run = useCallback(async () => {
    if (!table) return;
    if (!(await guestSessionBoundToTable(table))) return;

    const status = await fetchTableVisitStatus(table);
    if (status && !status.visitOpen) {
      clearTableCustomerSession(table);
      return;
    }

    await syncTableVisitEndIfNeeded(table);
  }, [table]);

  useEffect(() => {
    if (!table) return;
    void run();
    const timer = setInterval(() => void run(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [table, run]);
}
