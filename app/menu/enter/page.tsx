"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GuestStatusScreen } from "@/app/components/GuestStatusScreen";
import { fetchGuestSessionStatus } from "@/lib/api-guest-session";
import { openTableVisitOnScan } from "@/lib/api-table-visit";
import { guestAccessDeniedUrl } from "@/lib/guest-session-paths";
import { isGuestQrSecurityEnabledClient } from "@/lib/guest-qr-security";
import { MENU_PAGE_PATH, pathWithTable, tableLetterFromSearch } from "@/lib/menu-url";
import {
  clearTableVisitEndedMark,
  formatTableLabel,
  normalizeTableLetter,
} from "@/lib/table-session";

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

      if (isGuestQrSecurityEnabledClient()) {
        const guest = await fetchGuestSessionStatus();
        if (cancelled) return;
        if (!guest?.valid || normalizeTableLetter(guest.tableLetter) !== table) {
          setError(
            "Could not link this device to your table. Please scan the QR code again.",
          );
          return;
        }
      }

      clearTableVisitEndedMark(table);
      // Full page load so the new httpOnly session cookie is sent to the menu guard.
      window.location.assign(pathWithTable(MENU_PAGE_PATH, table));
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, router]);

  if (error) {
    return (
      <GuestStatusScreen
        icon="table_restaurant"
        title="Can't open this table"
        action={
          isGuestQrSecurityEnabledClient() ? (
            <button
              type="button"
              className="guest-status-btn"
              onClick={() => router.replace(guestAccessDeniedUrl("device_locked"))}
            >
              Why can&apos;t I open this link?
            </button>
          ) : (
            <button
              type="button"
              className="guest-status-btn"
              onClick={() => router.replace(MENU_PAGE_PATH)}
            >
              Browse menu without table
            </button>
          )
        }
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
