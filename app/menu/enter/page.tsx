"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GuestStatusScreen } from "@/app/components/GuestStatusScreen";
import { openTableVisitOnScan } from "@/lib/api-table-visit";
import { MENU_PAGE_PATH, pathWithTable, tableLetterFromSearch } from "@/lib/menu-url";
import {
  TABLE_SESSION_STORAGE_KEY,
  clearTableVisitEndedMark,
  formatTableLabel,
  isLikelyFreshQrEntry,
  isTableVisitEnded,
} from "@/lib/table-session";

/**
 * QR codes point here (not /menu?table=). Opens the server visit, then redirects to the menu.
 * Bookmarking /menu?table= after staff completes the order does not reopen the visit.
 */
export default function MenuEnterPage() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const table = tableLetterFromSearch(searchParams.toString());
    if (!table) {
      setError("Scan the QR code at your table to open the menu.");
      return;
    }

    if (isTableVisitEnded(table) || !isLikelyFreshQrEntry()) {
      setError(
        isTableVisitEnded(table)
          ? "Your table session has ended. Scan the QR code at your table to order again."
          : "Scan the QR code at your table to open the menu. Shared links cannot start a table session.",
      );
      return;
    }

    let cancelled = false;

    (async () => {
      const status = await openTableVisitOnScan(table);
      if (cancelled) return;

      if (!status) {
        setError("Could not connect to the server. Scan the QR code at your table to try again.");
        return;
      }

      if (status.code === "visit_closed") {
        setError(
          status.error ??
            `Table ${formatTableLabel(table)} is not open yet. Ask staff to tap Open table for new guests.`,
        );
        return;
      }

      if (status.code === "session_locked") {
        setError(
          status.error ??
            "This table is already linked to another device. Shared links cannot be used.",
        );
        return;
      }

      if (!status.canBind) {
        if (status?.hasActiveOrders) {
          setError(
            status?.error ??
              `Table ${formatTableLabel(table)} already has an order in progress. Ask staff for help.`,
          );
          return;
        }

        setError(
          status?.error ??
            `Table ${formatTableLabel(table)} is not accepting orders right now. Ask staff for help.`,
        );
        return;
      }

      clearTableVisitEndedMark(table);
      sessionStorage.setItem(TABLE_SESSION_STORAGE_KEY, table);
      // Full page load — menu guard validates the httpOnly cookie from the POST response.
      window.location.assign(pathWithTable(MENU_PAGE_PATH, table));
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  if (error) {
    const table = tableLetterFromSearch(searchParams.toString());
    return (
      <GuestStatusScreen
        icon="table_restaurant"
        title={table ? "Can't open this table" : "Scan your table QR"}
      >
        <p>{error}</p>
      </GuestStatusScreen>
    );
  }

  return (
    <GuestStatusScreen title="Opening your table" loading>
      <p>Hang tight — we&apos;re linking this device to your table so you can start ordering.</p>
    </GuestStatusScreen>
  );
}
