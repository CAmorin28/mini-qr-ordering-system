"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { Header } from "@/app/components/Header";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
import { PageEnter } from "@/app/components/ui/PageEnter";
import { useTableSession } from "@/app/context/TableSessionContext";
import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import {
  applyCustomerOrderUpsert,
  resolveCustomerRealtimeFilter,
} from "@/lib/customer-order-realtime";
import { formatPrice } from "@/lib/format";
import { listOrders, saveOrder } from "@/lib/order-history";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { normalizeTableLetter } from "@/lib/table-session";
import { checkoutConfirmationPath, MENU_PAGE_PATH } from "@/lib/menu-url";
import {
  PAYMENT_METHOD_LABELS,
  customerOrderStatusLabel,
} from "@/lib/order-labels";
import type { PlacedOrder } from "@/lib/types";

async function loadGuestOrders(): Promise<PlacedOrder[]> {
  let local = listOrders("");
  const active = activePlacedOrdersForTable(local, "");
  if (active.length === 0) return [];

  const refreshed = await Promise.all(
    active.map(async (o) => {
      try {
        return (await fetchOrderById(o.orderId)) ?? o;
      } catch {
        return o;
      }
    }),
  );

  const byId = new Map(local.map((o) => [o.orderId, o]));
  for (const order of refreshed) {
    byId.set(order.orderId, order);
    saveOrder(order);
  }
  return activePlacedOrdersForTable([...byId.values()], "");
}

export default function OrdersHistoryPage() {
  const { tableLetter, hasTableSession, pathWithSession } = useTableSession();
  const table = normalizeTableLetter(tableLetter);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"database" | "local">("database");

  const loadOrders = useCallback(async () => {
    if (table) {
      try {
        const fromApi = await fetchOrderHistory(table);
        for (const order of fromApi) {
          saveOrder(order);
        }
        setOrders(activePlacedOrdersForTable(fromApi, table));
        setSource("database");
      } catch {
        setOrders(activePlacedOrdersForTable(listOrders(table), table));
        setSource("local");
      }
      return;
    }

    setOrders(await loadGuestOrders());
    setSource("local");
  }, [table]);

  useEffect(() => {
    loadOrders().finally(() => setLoading(false));
  }, [loadOrders]);

  const realtimeFilter = useMemo(
    () => resolveCustomerRealtimeFilter(tableLetter, orders),
    [tableLetter, orders],
  );

  useOrdersRealtime(
    realtimeFilter ?? { mode: "orderIds", orderIds: [] },
    {
      onUpsert: (order) => {
        applyCustomerOrderUpsert(
          order,
          {
            tableLetter,
            trackedOrderIds: table
              ? undefined
              : new Set([
                  ...ordersRef.current.map((o) => o.orderId),
                  ...activePlacedOrdersForTable(listOrders(""), "").map((o) => o.orderId),
                ]),
          },
          setOrders,
          { onDatabaseSource: () => setSource("database") },
        );
      },
    },
    {
      enabled: realtimeFilter !== null,
      fallbackPoll: loadOrders,
      pollIntervalMs: 3_000,
    },
  );

  return (
    <div className="orders-page customer-page-shell flex h-full min-h-0 w-full min-w-0 max-w-full flex-col overflow-hidden bg-background">
      <Header showCart showBackToMenu showOrderStatus />
      <main className="customer-page-scroll page-main mx-auto w-full min-w-0 max-w-2xl flex-1 px-margin-mobile pt-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] md:px-margin-desktop">
        <h1 className="text-balance text-xl font-bold text-on-surface sm:text-2xl">Order status</h1>
        <p className="mt-1 text-pretty text-sm leading-relaxed text-on-surface-variant">
          {hasTableSession ? `Table ${tableLetter} · ` : ""}
          Each order updates live here — open one for the full receipt and kitchen
          tracker (same as step 3 after checkout).
          {hasTableSession
            ? " When staff completes your visit, orders clear for the next guest."
            : " Orders on this device are saved locally until staff marks them complete."}
          {source === "local" ? " (Showing saved orders on this device.)" : ""}
          {" "}Status updates live when staff change your order.
        </p>

        {loading ? (
          <LoadingBlock className="mt-xl py-xl" message="Loading orders…" />
        ) : orders.length === 0 ? (
          <div className="mt-xl rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-surface-variant">
              receipt_long
            </span>
            <p className="mt-md text-on-surface-variant">
              No active orders yet. Browse the menu and check out to track your order here.
            </p>
            <Link
              href={pathWithSession(MENU_PAGE_PATH)}
              className="mt-md inline-flex rounded-xl bg-primary px-lg py-3 text-sm font-bold text-on-primary"
            >
              Browse menu
            </Link>
          </div>
        ) : (
          <PageEnter>
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
          </PageEnter>
        )}
      </main>
    </div>
  );
}
