"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActiveCustomerOrders } from "@/app/hooks/useActiveCustomerOrders";
import { useTableSession } from "@/app/context/TableSessionContext";
import { resolveOrderStatusHref } from "@/lib/order-status-nav";
import { ORDERS_HISTORY_PATH } from "@/lib/menu-url";

interface OrderStatusNavButtonProps {
  /** Show text label on sm+ breakpoints (default true). */
  showLabel?: boolean;
}

export function OrderStatusNavButton({ showLabel = true }: OrderStatusNavButtonProps) {
  const pathname = usePathname();
  const { tableLetter, hasTableSession, pathWithSession } = useTableSession();
  const { orders, loading } = useActiveCustomerOrders(tableLetter);

  const href = resolveOrderStatusHref(orders, tableLetter, pathWithSession);
  if (!hasTableSession || !href || loading) return null;

  const onStatusPage =
    pathname.startsWith("/checkout/confirmation/") ||
    pathname === ORDERS_HISTORY_PATH;
  if (onStatusPage && orders.length <= 1) return null;

  return (
    <Link
      href={href}
      className="relative flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-on-primary/25 px-2.5 py-2.5 text-sm font-semibold text-on-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container active:scale-95 sm:gap-2 sm:px-3"
      aria-label="Order status — view receipt and live updates"
    >
      <span className="material-symbols-outlined text-[22px]">receipt_long</span>
      {showLabel && (
        <span className="hidden max-w-[9rem] truncate sm:inline">Order status</span>
      )}
      <span
        className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-secondary-container ring-2 ring-primary"
        aria-hidden
      />
    </Link>
  );
}
