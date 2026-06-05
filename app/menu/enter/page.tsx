"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openTableVisitOnScan } from "@/lib/api-table-visit";
import { guestAccessDeniedUrl } from "@/lib/guest-session-paths";
import { isGuestQrSecurityEnabledClient } from "@/lib/guest-qr-security";
import { MENU_PAGE_PATH, pathWithTable, tableLetterFromSearch } from "@/lib/menu-url";
import { clearTableVisitEndedMark, formatTableLabel } from "@/lib/table-session";

/**
 * QR codes point here (not /menu?table=). Opens the server visit, then redirects to the menu.
 * Bookmarking /menu?table= after staff completes the order does not reopen the visit.
 */
export default function MenuEnterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const table = tableLetterFromSearch(searchParams.toString());
    if (!table) {
      if (isGuestQrSecurityEnabledClient()) {
        router.replace(guestAccessDeniedUrl("scan_required"));
        return;
      }
      router.replace(MENU_PAGE_PATH);
      return;
    }

    let cancelled = false;

    (async () => {
      const status = await openTableVisitOnScan(table);
      if (cancelled) return;

      if (status?.code === "session_locked") {
        if (isGuestQrSecurityEnabledClient()) {
          router.replace(guestAccessDeniedUrl("device_locked"));
          return;
        }
        setError(
          status.error ??
            "This table is already linked to another device. Shared links cannot be used.",
        );
        return;
      }

      if (!status?.canBind) {
        setError(
          status?.error ??
            `Table ${formatTableLabel(table)} is not accepting orders right now. Ask staff for help.`,
        );
        return;
      }

      clearTableVisitEndedMark(table);
      router.replace(pathWithTable(MENU_PAGE_PATH, table));
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="customer-page-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <main className="customer-page-scroll mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-md py-xl text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant">
            table_restaurant
          </span>
          <p className="text-on-surface">{error}</p>
          {isGuestQrSecurityEnabledClient() ? (
            <button
              type="button"
              className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-on-secondary"
              onClick={() => router.replace(guestAccessDeniedUrl("device_locked"))}
            >
              Why can&apos;t I open this link?
            </button>
          ) : (
            <button
              type="button"
              className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-on-secondary"
              onClick={() => router.replace(MENU_PAGE_PATH)}
            >
              Browse menu without table
            </button>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="customer-page-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <main className="customer-page-scroll mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-md py-xl text-center">
        <span
          className="material-symbols-outlined animate-pulse text-4xl text-secondary"
          aria-hidden
        >
          qr_code_scanner
        </span>
        <p className="text-on-surface-variant">Opening your table session…</p>
      </main>
    </div>
  );
}
