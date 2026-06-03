"use client";

import Link from "next/link";
import { useActiveCustomerOrders } from "@/app/hooks/useActiveCustomerOrders";
import { useTableSession } from "@/app/context/TableSessionContext";
import { customerOrderStatusLabel } from "@/lib/order-labels";
import { resolveOrderStatusHref } from "@/lib/order-status-nav";

export function ActiveOrderBanner() {
  const { tableLetter, tableLabel, hasTableSession, pathWithSession } = useTableSession();
  const { orders, loading } = useActiveCustomerOrders(tableLetter);

  const href = resolveOrderStatusHref(orders, tableLetter, pathWithSession);
  if (!hasTableSession || !href || loading || orders.length === 0) return null;

  const primary = orders[0];

  return (
    <Link
      href={href}
      className="mb-md flex items-center gap-3 rounded-2xl border border-secondary-container/40 bg-gradient-to-r from-secondary-container/25 to-surface-container-lowest p-md shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
    >
      <span className="material-symbols-outlined shrink-0 text-[32px] text-secondary">
        receipt_long
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-on-surface">
          Your order is in progress · {tableLabel}
        </p>
        <p className="mt-0.5 truncate text-xs text-on-surface-variant">
          {primary.orderNumber} · {customerOrderStatusLabel(primary)}
        </p>
        <p className="mt-1 text-xs font-semibold text-secondary">
          Tap for live status &amp; receipt
        </p>
      </div>
      <span className="material-symbols-outlined shrink-0 text-on-surface-variant">
        chevron_right
      </span>
    </Link>
  );
}
