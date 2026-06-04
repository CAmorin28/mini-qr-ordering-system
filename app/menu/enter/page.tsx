"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { openTableVisitOnScan } from "@/lib/api-table-visit";
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
      router.replace(MENU_PAGE_PATH);
      return;
    }

    let cancelled = false;

    (async () => {
      const status = await openTableVisitOnScan(table);
      if (cancelled) return;

      if (!status?.canBind) {
        setError(
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
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center gap-4 px-md py-xl text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">
          table_restaurant
        </span>
        <p className="text-on-surface">{error}</p>
        <button
          type="button"
          className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-on-secondary"
          onClick={() => router.replace(MENU_PAGE_PATH)}
        >
          Browse menu without table
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[40vh] max-w-md flex-col items-center justify-center gap-3 px-md py-xl text-center">
      <span
        className="material-symbols-outlined animate-pulse text-4xl text-secondary"
        aria-hidden
      >
        qr_code_scanner
      </span>
      <p className="text-on-surface-variant">Opening your table session…</p>
    </main>
  );
}
