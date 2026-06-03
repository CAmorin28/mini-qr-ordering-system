"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { useTableSession } from "@/app/context/TableSessionContext";
import { fetchOrderHistory } from "@/lib/api";
import { customerVisibleOrders } from "@/lib/customer-table-session";
import { formatPrice } from "@/lib/format";
import { listOrders } from "@/lib/order-history";
import { checkoutConfirmationPath, MENU_PAGE_PATH } from "@/lib/menu-url";
import {
  PAYMENT_METHOD_LABELS,
  customerOrderStatusLabel,
} from "@/lib/order-labels";
import { isPlacedOrder } from "@/lib/place-order";
import type { PlacedOrder } from "@/lib/types";

const POLL_MS = 8000;

export default function OrdersHistoryPage() {
  const { tableLetter, pathWithSession } = useTableSession();
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"database" | "local">("database");

  const loadOrders = useCallback(async () => {
    try {
      const fromApi = await fetchOrderHistory(tableLetter);
      const placed = customerVisibleOrders(fromApi.filter(isPlacedOrder));
      setOrders(placed);
      setSource("database");
    } catch {
      const local = listOrders(tableLetter).filter(isPlacedOrder);
      setOrders(local);
      setSource("local");
    }
  }, [tableLetter]);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadOrders();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [loadOrders]);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header showCart showBackToMenu />
      <main className="mx-auto w-full max-w-2xl flex-1 px-margin-mobile pb-xl pt-[calc(var(--header-height)+20px)] md:px-margin-desktop">
        <h1 className="text-2xl font-bold text-on-surface">Your orders</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          {tableLetter
            ? `Table ${tableLetter} · `
            : ""}
          Live status for your current visit. When staff completes your order, it
          disappears here so the table is ready for the next guest.
          {source === "local" ? " (Showing saved orders on this device.)" : ""}
        </p>

        {loading ? (
          <p className="mt-lg text-on-surface-variant">Loading orders…</p>
        ) : orders.length === 0 ? (
          <div className="mt-xl rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-surface-variant">
              receipt_long
            </span>
            <p className="mt-md text-on-surface-variant">
              {tableLetter
                ? "No active orders for this table. Scan the QR or browse the menu to start a new order."
                : "No active orders yet."}
            </p>
            <Link
              href={pathWithSession(MENU_PAGE_PATH)}
              className="mt-md inline-flex rounded-xl bg-primary px-lg py-3 text-sm font-bold text-on-primary"
            >
              Browse menu
            </Link>
          </div>
        ) : (
          <ul className="mt-lg space-y-md">
            {orders.map((order) => (
              <li key={order.orderId}>
                <Link
                  href={pathWithSession(checkoutConfirmationPath(order.orderId))}
                  className="block rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-on-surface">{order.orderNumber}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(order.createdAt).toLocaleString("en-PH")}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-secondary">
                      {formatPrice(order.grandTotal)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {order.lines.length} item{order.lines.length === 1 ? "" : "s"} ·{" "}
                    {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
                    {customerOrderStatusLabel(order)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
