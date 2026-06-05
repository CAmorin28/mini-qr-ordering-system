"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckoutShell } from "@/app/components/CheckoutShell";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
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
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const visitComplete = order ? isCompletedOrder(order) || visitEnded : false;
  const otherActiveCount = order
    ? activeTableOrders.filter((o) => o.orderId !== order.orderId).length
    : 0;
  const showAllOrdersLink = activeTableOrders.length > 1 || otherActiveCount > 0;

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

  async function handleDownloadPdf() {
    if (!order || pdfDownloading) return;
    setPdfError(null);
    setPdfDownloading(true);
    try {
      await downloadReceiptPdf("order-receipt", `${order.orderNumber}-receipt`);
    } catch (err) {
      setPdfError(
        err instanceof Error ? err.message : "Could not create PDF. Please try again.",
      );
    } finally {
      setPdfDownloading(false);
    }
  }

  if (loading || !order) {
    return (
      <div className="checkout-page customer-page-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
        <LoadingBlock fullPage message="Loading your receipt…" />
      </div>
    );
  }

  const paidViaGcash = order.paymentMethod === "gcash" && order.paymentStatus === "paid";

  const confirmationActions = (
    <>
      <button
        type="button"
        disabled={pdfDownloading}
        onClick={() => void handleDownloadPdf()}
        className="checkout-actions-secondary rounded-xl border border-secondary-container bg-secondary-container/15 font-semibold text-secondary hover:bg-secondary-container/25 disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[20px]">
          {pdfDownloading ? "hourglass_top" : "download"}
        </span>
        {pdfDownloading ? "Creating PDF…" : "Download receipt as PDF"}
      </button>
      {visitComplete ? (
        <Link
          href={MENU_PAGE_PATH}
          onClick={(e) => {
            e.preventDefault();
            if (hasTableSession) {
              clearTableSession();
              clearCart();
            }
            router.push(MENU_PAGE_PATH);
          }}
          className="checkout-cta checkout-actions-primary rounded-xl bg-primary font-bold text-on-primary shadow-md hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[20px]">
            {hasTableSession ? "qr_code_scanner" : "restaurant_menu"}
          </span>
          {hasTableSession ? "Done — scan QR for your next visit" : "Done — back to menu"}
        </Link>
      ) : (
        <Link
          href={pathWithSession(MENU_PAGE_PATH)}
          className="checkout-cta checkout-actions-primary rounded-xl bg-primary font-bold text-on-primary shadow-md hover:bg-primary-container"
        >
          <span className="material-symbols-outlined text-[20px]">restaurant_menu</span>
          Back to menu
        </Link>
      )}
      {showAllOrdersLink && (
        <Link
          href={pathWithSession(ORDERS_HISTORY_PATH)}
          className="checkout-actions-full rounded-xl border border-primary font-semibold text-primary hover:bg-primary-container/10"
        >
          <span className="material-symbols-outlined text-[20px]">receipt_long</span>
          All active orders ({activeTableOrders.length})
        </Link>
      )}
    </>
  );

  return (
    <CheckoutShell
      step={3}
      title={paidViaGcash ? "Payment successful" : "Order placed"}
      subtitle="Track your order status below. The kitchen will update progress as your food is prepared."
      aside={
        <>
          <div className="confirmation-success min-w-0 max-w-full overflow-hidden rounded-2xl border border-secondary-container/30 bg-gradient-to-br from-secondary-container/20 to-surface-container-lowest p-md sm:p-lg">
            <div className="flex min-w-0 flex-col items-center text-center sm:flex-row sm:items-start sm:gap-md sm:text-left">
              <span className="material-symbols-outlined shrink-0 text-[48px] text-secondary sm:text-[56px]">
                check_circle
              </span>
              <div className="mt-3 min-w-0 flex-1 sm:mt-0">
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

          {!visitComplete && (
            <div className="rounded-2xl border border-primary-container/30 bg-primary-container/10 p-md print:hidden">
              <p className="text-sm font-semibold text-on-surface">Want to add more?</p>
              <p className="mt-1 text-xs text-on-surface-variant">
                {hasTableSession
                  ? "You can place another order for the same table while this one is being prepared (dessert, drinks, extras)."
                  : "You can place another order while this one is being prepared (dessert, drinks, extras)."}
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
        </>
      }
      footerActions={confirmationActions}
    >
      <OrderStatusTracker
        orderId={order.orderId}
        initialOrder={order}
        onUpdate={setOrder}
        onVisitEnded={() => setVisitEnded(true)}
      />

      {pdfError ? (
        <p className="rounded-lg border border-error bg-error-container px-md py-sm text-sm text-error print:hidden">
          {pdfError}
        </p>
      ) : null}

      <div className="min-w-0 max-w-full overflow-hidden">
        <OrderReceipt order={order} />
      </div>
    </CheckoutShell>
  );
}
