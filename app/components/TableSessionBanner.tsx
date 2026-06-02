"use client";

import { useTableSession } from "@/app/context/TableSessionContext";

export function TableSessionBanner() {
  const { tableLabel, hasTableSession } = useTableSession();

  if (hasTableSession) {
    return (
      <div className="mb-md flex items-center justify-between gap-3 rounded-2xl border border-secondary-container/40 bg-secondary-container/15 px-md py-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary">table_restaurant</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Your session
            </p>
            <p className="text-lg font-bold text-on-surface">{tableLabel}</p>
          </div>
        </div>
        <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
          QR session
        </span>
      </div>
    );
  }

  return (
    <div className="mb-md rounded-2xl border border-dashed border-surface-variant bg-surface-container-low px-md py-3 text-sm text-on-surface-variant">
      <p className="font-semibold text-on-surface">Scan your table QR code</p>
      <p className="mt-1">
        All orders (dine-in and pick-up) require a table QR from staff (e.g. Table A). Scan the code
        at your table or ask staff if you need one.
      </p>
    </div>
  );
}
