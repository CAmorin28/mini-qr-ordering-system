"use client";

import { useTableSession } from "@/app/context/TableSessionContext";

/** Shown only after a table QR scan; hidden for walk-in / direct menu visits. */
export function TableSessionBanner() {
  const { tableLabel, hasTableSession } = useTableSession();

  if (!hasTableSession) return null;

  return (
    <div className="mb-md flex min-w-0 max-w-full flex-wrap items-center justify-between gap-2 rounded-2xl border border-secondary-container/40 bg-secondary-container/15 px-md py-3 sm:gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="material-symbols-outlined shrink-0 text-secondary">table_restaurant</span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Your session
          </p>
          <p className="text-lg font-bold text-on-surface">{tableLabel}</p>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
        QR session
      </span>
    </div>
  );
}
