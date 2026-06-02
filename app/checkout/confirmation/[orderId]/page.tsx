"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell } from "@/app/components/CheckoutShell";
import { OrderReceipt } from "@/app/components/OrderReceipt";
import { useCart } from "@/app/context/CartContext";
import { useCheckout } from "@/app/context/CheckoutContext";
import { fetchOrderById } from "@/lib/api";
import {
  PAYMENT_METHOD_LABELS,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";
import { consumePendingOrder, getOrder } from "@/lib/order-history";
import { isPlacedOrder } from "@/lib/place-order";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";
import { CHECKOUT_REVIEW_PATH, MENU_PAGE_PATH, ORDERS_HISTORY_PATH } from "@/lib/menu-url";
import type { PlacedOrder } from "@/lib/types";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = decodeURIComponent(params.orderId as string);
  const { clearCart } = useCart();
  const { clearCheckout } = useCheckout();
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const pending = consumePendingOrder(orderId);
      if (pending && isPlacedOrder(pending)) {
        if (!cancelled) {
          setOrder(pending);
          clearCart();
          clearCheckout();
          setLoading(false);
        }
        return;
      }

      try {
        const fromApi = await fetchOrderById(orderId);
        if (fromApi && isPlacedOrder(fromApi)) {
          if (!cancelled) {
            setOrder(fromApi);
            clearCart();
            clearCheckout();
            setLoading(false);
          }
          return;
        }
      } catch {
        /* fall through to local */
      }

      const local = getOrder(orderId);
      if (!local || !isPlacedOrder(local)) {
        router.replace(local ? CHECKOUT_REVIEW_PATH : MENU_PAGE_PATH);
        return;
      }

      if (!cancelled) {
        setOrder(local);
        clearCart();
        clearCheckout();
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, router, clearCart, clearCheckout]);

  function handlePrint() {
    window.print();
  }

  if (loading || !order) {
    return (
      <div className="checkout-page flex min-h-dvh items-center justify-center bg-background">
        <p className="text-on-surface-variant">Loading your receipt…</p>
      </div>
    );
  }

  return (
    <CheckoutShell
      step={3}
      title="Payment successful"
      subtitle="Your order is confirmed. Here is your digital receipt."
    >
      <div className="confirmation-success mb-lg rounded-2xl border border-secondary-container/30 bg-gradient-to-br from-secondary-container/20 to-surface-container-lowest p-lg">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-md sm:text-left">
          <span className="material-symbols-outlined text-[56px] text-secondary">
            check_circle
          </span>
          <div className="mt-3 sm:mt-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Payment successful
            </p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">
              {orderStatusLabel(order.status)}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">Payment status:</span>{" "}
              {paymentStatusLabel(order.paymentStatus, order.status)}
            </p>
            <p className="mt-2 text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">Estimated delivery:</span>{" "}
              {order.estimatedDelivery}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">Payment method:</span>{" "}
              {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </p>
            <p className="mt-1 text-sm font-semibold text-on-surface">
              Order {order.orderNumber}
            </p>
          </div>
        </div>
      </div>

      <OrderReceipt order={order} />

      <div className="confirmation-actions mt-lg grid gap-sm sm:grid-cols-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest py-3 text-sm font-semibold text-on-surface hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[20px]">print</span>
          Print receipt
        </button>
        <button
          type="button"
          onClick={() => downloadReceiptPdf(order)}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-secondary-container bg-secondary-container/15 py-3 text-sm font-semibold text-secondary hover:bg-secondary-container/25"
        >
          <span className="material-symbols-outlined text-[20px]">download</span>
          Download receipt as PDF
        </button>
        <Link
          href={MENU_PAGE_PATH}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary sm:col-span-2"
        >
          <span className="material-symbols-outlined text-[20px]">home</span>
          Back to home
        </Link>
        <Link
          href={ORDERS_HISTORY_PATH}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary py-3 text-sm font-semibold text-primary sm:col-span-2"
        >
          <span className="material-symbols-outlined text-[20px]">history</span>
          View order history
        </Link>
      </div>
    </CheckoutShell>
  );
}
