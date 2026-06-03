"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell } from "@/app/components/CheckoutShell";
import { OrderReceipt } from "@/app/components/OrderReceipt";
import { OrderStatusTracker } from "@/app/components/OrderStatusTracker";
import { useCart } from "@/app/context/CartContext";
import { useCheckout } from "@/app/context/CheckoutContext";
import { useActiveCustomerOrders } from "@/app/hooks/useActiveCustomerOrders";
import { useTableSession } from "@/app/context/TableSessionContext";
import { isCompletedOrder } from "@/lib/order-completion";
import { fetchOrderById } from "@/lib/api";
import {
  PAYMENT_METHOD_LABELS,
  customerOrderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";
import { consumePendingOrder, getOrder, saveOrder } from "@/lib/order-history";
import { isPlacedOrder } from "@/lib/place-order";
import { downloadReceiptPdf } from "@/lib/receipt-pdf";
import {
  CHECKOUT_REVIEW_PATH,
  MENU_PAGE_PATH,
  ORDERS_HISTORY_PATH,
} from "@/lib/menu-url";
import type { PlacedOrder } from "@/lib/types";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = decodeURIComponent(params.orderId as string);
  const { clearCart } = useCart();
  const { clearCheckout } = useCheckout();
  const { tableLetter, hasTableSession, pathWithSession, clearTableSession } =
    useTableSession();
  const { orders: activeTableOrders } = useActiveCustomerOrders(tableLetter);
  const [order, setOrder] = useState<PlacedOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [visitEnded, setVisitEnded] = useState(false);

  const visitComplete = order ? isCompletedOrder(order) || visitEnded : false;
  const otherActiveCount = order
    ? activeTableOrders.filter((o) => o.orderId !== order.orderId).length
    : 0;
  const showAllOrdersLink = hasTableSession && (activeTableOrders.length > 1 || otherActiveCount > 0);

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
          saveOrder(fromApi);
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
        router.replace(local ? pathWithSession(CHECKOUT_REVIEW_PATH) : pathWithSession(MENU_PAGE_PATH));
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
  }, [orderId, router, clearCart, clearCheckout, pathWithSession]);

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

  const paidViaGcash = order.paymentMethod === "gcash" && order.paymentStatus === "paid";

  return (
    <CheckoutShell
      step={3}
      title={paidViaGcash ? "Payment successful" : "Order placed"}
      subtitle="Track your order status below. The kitchen will update progress as your food is prepared."
    >
      <OrderStatusTracker
        orderId={order.orderId}
        initialOrder={order}
        onUpdate={setOrder}
        onVisitEnded={() => setVisitEnded(true)}
      />

      <div className="confirmation-success mb-lg mt-lg rounded-2xl border border-secondary-container/30 bg-gradient-to-br from-secondary-container/20 to-surface-container-lowest p-lg">
        <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:gap-md sm:text-left">
          <span className="material-symbols-outlined text-[56px] text-secondary">
            check_circle
          </span>
          <div className="mt-3 sm:mt-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
              {paidViaGcash ? "Payment successful" : "Order received"}
            </p>
            <h2 className="mt-1 text-xl font-bold text-on-surface">
              {customerOrderStatusLabel(order)}
            </h2>
            <p className="mt-2 text-sm text-on-surface-variant">
              <span className="font-medium text-on-surface">Payment:</span>{" "}
              {paymentStatusLabel(order.paymentStatus)}
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

      {hasTableSession && !visitComplete && (
        <div className="mt-lg rounded-2xl border border-primary-container/30 bg-primary-container/10 p-md print:hidden">
          <p className="text-sm font-semibold text-on-surface">Want to add more?</p>
          <p className="mt-1 text-xs text-on-surface-variant">
            You can place another order for the same table while this one is being prepared
            (dessert, drinks, extras).
          </p>
          <Link
            href={pathWithSession(MENU_PAGE_PATH)}
            className="mt-md inline-flex w-full items-center justify-center gap-2 rounded-xl bg-secondary-container py-3 text-sm font-bold text-on-secondary-container sm:w-auto sm:px-lg"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add another order
          </Link>
        </div>
      )}

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
        {visitComplete ? (
          <Link
            href={MENU_PAGE_PATH}
            onClick={() => clearTableSession()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary sm:col-span-2"
          >
            <span className="material-symbols-outlined text-[20px]">qr_code_scanner</span>
            Done — scan QR for your next visit
          </Link>
        ) : (
          <Link
            href={pathWithSession(MENU_PAGE_PATH)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-on-primary sm:col-span-2"
          >
            <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
            Back to menu
          </Link>
        )}
        {showAllOrdersLink && (
          <Link
            href={pathWithSession(ORDERS_HISTORY_PATH)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary py-3 text-sm font-semibold text-primary sm:col-span-2"
          >
            <span className="material-symbols-outlined text-[20px]">receipt_long</span>
            All active orders ({activeTableOrders.length})
          </Link>
        )}
      </div>
    </CheckoutShell>
  );
}
