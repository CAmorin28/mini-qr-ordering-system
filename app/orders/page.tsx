"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Header } from "@/app/components/Header";
import { formatPrice } from "@/lib/format";
import { listOrders } from "@/lib/order-history";
import { checkoutConfirmationPath, MENU_PAGE_PATH } from "@/lib/menu-url";
import { PAYMENT_METHOD_LABELS, paymentStatusLabel } from "@/lib/order-labels";
import type { PlacedOrder } from "@/lib/types";

function isConfirmedOrder(order: PlacedOrder): boolean {
  if (order.paymentStatus === "paid") return true;
  if (order.paymentStatus === "failed" || order.paymentStatus === "pending") {
    return false;
  }
  return order.status === "confirmed" || (order.status as string) === "placed";
}

export default function OrdersHistoryPage() {
  const [orders, setOrders] = useState<PlacedOrder[]>([]);

  useEffect(() => {
    setOrders(listOrders().filter(isConfirmedOrder));
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Header showCart showBackToMenu />
      <main className="mx-auto w-full max-w-2xl flex-1 px-margin-mobile pb-xl pt-[calc(var(--header-height)+20px)] md:px-margin-desktop">
        <h1 className="text-2xl font-bold text-on-surface">Order history</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Your recent TableBite orders on this device.
        </p>

        {orders.length === 0 ? (
          <div className="mt-xl rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-surface-variant">
              receipt_long
            </span>
            <p className="mt-md text-on-surface-variant">No orders yet.</p>
            <Link
              href={MENU_PAGE_PATH}
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
                  href={checkoutConfirmationPath(order.orderId)}
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
                    {paymentStatusLabel(order.paymentStatus, order.status)}
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
