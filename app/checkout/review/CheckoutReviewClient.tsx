"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckoutShell } from "@/app/components/CheckoutShell";
import { MockPaymentDevControls } from "@/app/components/MockPaymentDevControls";
import { PaymentFailedPanel } from "@/app/components/PaymentFailedPanel";
import { PaymentProcessingOverlay } from "@/app/components/PaymentProcessingOverlay";
import { PaymentMethodIcon } from "@/app/components/PaymentMethodIcon";
import { useCart } from "@/app/context/CartContext";
import { emptyCustomer, useCheckout } from "@/app/context/CheckoutContext";
import { useTableSession } from "@/app/context/TableSessionContext";
import {
  computeGrandTotal,
  computeSubtotal,
  lineSubtotal,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { saveOrder, setPendingOrder } from "@/lib/order-history";
import {
  buildPlacedOrder,
  generateOrderId,
  placeOrderWithSimulation,
} from "@/lib/place-order";
import {
  CHECKOUT_PAGE_PATH,
  checkoutConfirmationPath,
  MENU_PAGE_PATH,
} from "@/lib/menu-url";
import { formatTableLabel } from "@/lib/table-session";
import { simulateMockPayment } from "@/lib/mock-payment";
import type { OrderType, PaymentMethod } from "@/lib/types";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    id: "gcash",
    label: "GCash",
    description: "Simulated mobile wallet — pay now",
  },
  {
    id: "cash",
    label: "Cash",
    description: "Pay at the table or counter (confirmed by staff)",
  },
];

const ORDER_TYPE_OPTIONS: { id: OrderType; label: string; icon: string }[] = [
  { id: "dine_in", label: "Dine-in", icon: "restaurant" },
  { id: "pickup", label: "Pick-up at counter", icon: "takeout_dining" },
];

export default function CheckoutReviewClient() {
  const router = useRouter();
  const { lines, itemCount } = useCart();
  const { cutlery, customer, paymentMethod, setCustomer, setPaymentMethod } =
    useCheckout();
  const { tableLetter, hasTableSession, pathWithSession } = useTableSession();

  const [form, setForm] = useState(() => ({
    ...(customer ?? emptyCustomer),
    tableLetter: customer?.tableLetter || tableLetter,
  }));
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const placedSuccessfully = useRef(false);

  const subtotal = computeSubtotal(lines);
  const grandTotal = computeGrandTotal(subtotal);
  const isPayNow = paymentMethod === "gcash";
  const menuPath = pathWithSession(MENU_PAGE_PATH);

  useEffect(() => {
    if (tableLetter && form.tableLetter !== tableLetter) {
      setForm((f) => ({ ...f, tableLetter }));
    }
  }, [tableLetter, form.tableLetter]);

  useEffect(() => {
    if (itemCount === 0 && !processingPayment && !placedSuccessfully.current) {
      router.replace(menuPath);
    }
  }, [itemCount, router, processingPayment, menuPath]);

  if (itemCount === 0 && !processingPayment) {
    return null;
  }

  async function handlePlaceOrder(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPaymentError(null);

    if (!form.fullName.trim()) {
      setFormError("Please enter your name for the order.");
      return;
    }
    if (!paymentMethod) {
      setFormError("Please select a payment method.");
      return;
    }

    const customerDetails = {
      ...form,
      tableLetter: form.tableLetter || tableLetter,
    };

    setCustomer(customerDetails);

    if (paymentMethod === "gcash") {
      setProcessingPayment(true);
      const paymentResult = await simulateMockPayment();
      if (!paymentResult.success) {
        setProcessingPayment(false);
        setPaymentError(paymentResult.message);
        return;
      }
    } else {
      setProcessingPayment(true);
    }

    try {
      const draft = buildPlacedOrder({
        orderId: generateOrderId(),
        lines,
        cutlery,
        paymentMethod,
        customer: customerDetails,
      });

      const placed = await placeOrderWithSimulation(draft);
      saveOrder(placed);
      setPendingOrder(placed);
      placedSuccessfully.current = true;
      router.push(pathWithSession(checkoutConfirmationPath(placed.orderId)));
    } catch (err) {
      placedSuccessfully.current = false;
      setProcessingPayment(false);
      const message =
        err instanceof Error ? err.message : "Could not complete your order.";
      if (paymentMethod === "gcash") {
        setPaymentError(message);
      } else {
        setFormError(message);
      }
    }
  }

  function handleRetryPayment() {
    setPaymentError(null);
  }

  return (
    <>
      {processingPayment && paymentMethod === "gcash" && (
        <PaymentProcessingOverlay
          paymentMethod={paymentMethod}
          amount={grandTotal}
        />
      )}

      <CheckoutShell
        step={2}
        title="Review & pay"
        subtitle="Confirm your order details and choose how to pay."
        onSubmit={handlePlaceOrder}
        aside={
          <>
            <section className="checkout-aside-card rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg shadow-[0_8px_28px_rgba(29,29,53,0.08)]">
              <h2 className="text-headline-md font-semibold text-on-surface">Order review</h2>
              <ul className="mb-md mt-md space-y-2.5 border-b border-surface-variant pb-md">
                {lines.map((line) => (
                  <li key={line.item.id} className="price-row text-sm text-on-surface-variant sm:text-base">
                    <span className="min-w-0">
                      {line.item.name}{" "}
                      <span className="text-on-surface">× {line.quantity}</span>
                    </span>
                    <span className="font-medium text-on-surface">
                      {formatPrice(lineSubtotal(line))}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="price-row items-end border-t border-dashed border-surface-variant pt-md">
                <span className="text-base font-semibold text-on-surface">Total</span>
                <span className="checkout-aside-total text-2xl font-bold text-secondary">
                  {formatPrice(grandTotal)}
                </span>
              </div>
            </section>

            {paymentError && paymentMethod === "gcash" ? (
              <PaymentFailedPanel message={paymentError} onRetry={handleRetryPayment} />
            ) : null}

            {formError ? (
              <p className="rounded-lg border border-error bg-error-container px-md py-sm text-sm text-error">
                {formError}
              </p>
            ) : null}
          </>
        }
        footerActions={
          <>
            <Link
              href={pathWithSession(CHECKOUT_PAGE_PATH)}
              className={`checkout-actions-secondary rounded-xl border border-outline-variant font-semibold text-on-surface-variant hover:bg-surface-container ${
                processingPayment ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Back to summary
            </Link>
            <button
              type="submit"
              disabled={processingPayment}
              className="checkout-cta checkout-actions-primary rounded-xl bg-primary font-bold text-on-primary shadow-md hover:bg-primary-container disabled:opacity-60"
            >
              {processingPayment
                ? isPayNow
                  ? "Processing…"
                  : "Placing order…"
                : isPayNow
                  ? "Pay now"
                  : "Place order"}
              <span className="material-symbols-outlined text-[20px]">
                {isPayNow ? "account_balance_wallet" : "check"}
              </span>
            </button>
          </>
        }
      >
        <div className="space-y-md lg:space-y-5">
          {paymentMethod === "gcash" ? (
            <MockPaymentDevControls paymentMethod={paymentMethod} />
          ) : null}

          {hasTableSession ? (
            <div className="rounded-xl border border-secondary-container/30 bg-secondary-container/10 px-md py-sm text-sm">
              <span className="font-semibold text-on-surface">{formatTableLabel(tableLetter)}</span>
              <span className="text-on-surface-variant"> · QR table session</span>
            </div>
          ) : null}

          <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg">
            <h2 className="mb-md flex items-center gap-2 text-headline-md font-semibold">
              <span className="material-symbols-outlined text-secondary">storefront</span>
              Order type
            </h2>
            <div className="grid gap-sm sm:grid-cols-2">
              {ORDER_TYPE_OPTIONS.map((opt) => {
                const selected = form.orderType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={processingPayment}
                    onClick={() => setForm((f) => ({ ...f, orderType: opt.id }))}
                    className={`flex min-h-11 w-full touch-manipulation items-start gap-3 rounded-xl border p-md text-left transition-all disabled:opacity-60 ${
                      selected
                        ? "border-secondary-container bg-secondary-container/15 ring-2 ring-secondary-container/40"
                        : "border-surface-variant bg-surface-container-low hover:border-outline-variant"
                    }`}
                  >
                    <span className="material-symbols-outlined shrink-0 text-secondary">{opt.icon}</span>
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-on-surface">{opt.label}</span>
                      <p className="text-body-readable mt-0.5 text-xs text-on-surface-variant">
                        {opt.id === "dine_in"
                          ? hasTableSession
                            ? "We will bring your order to your table"
                            : "Tell staff your name — we will bring your order when ready"
                          : "Collect at the counter when ready"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg">
            <h2 className="mb-md flex items-center gap-2 text-headline-md font-semibold">
              <span className="material-symbols-outlined text-secondary">person</span>
              Your details
            </h2>
            <div className="grid gap-md sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">Name</span>
                <input
                  required
                  disabled={processingPayment}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="checkout-input w-full"
                  placeholder="Your name"
                />
              </label>
              {hasTableSession ? (
                <div className="block">
                  <span className="mb-1 block text-sm font-medium text-on-surface-variant">
                    Table
                  </span>
                  <div className="checkout-input flex items-center bg-surface-container-low font-bold text-on-surface">
                    {formatTableLabel(form.tableLetter || tableLetter)}
                  </div>
                </div>
              ) : null}
              <label className={`block ${hasTableSession ? "" : "sm:col-span-2"}`}>
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Contact number (optional)
                </span>
                <input
                  disabled={processingPayment}
                  type="tel"
                  value={form.contactNumber}
                  onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                  className="checkout-input w-full"
                  placeholder="09XX XXX XXXX"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Special requests (optional)
                </span>
                <textarea
                  disabled={processingPayment}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="checkout-input w-full resize-none"
                  placeholder="Allergies, extra sauce, etc."
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg">
            <h2 className="mb-md flex items-center gap-2 text-headline-md font-semibold">
              <span className="material-symbols-outlined text-secondary">credit_card</span>
              Payment method
            </h2>
            <div className="grid gap-sm sm:grid-cols-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const selected = paymentMethod === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={processingPayment}
                    onClick={() => {
                      setPaymentMethod(opt.id);
                      setPaymentError(null);
                    }}
                    className={`flex min-h-11 w-full touch-manipulation items-start gap-3 rounded-xl border p-md text-left transition-all disabled:opacity-60 ${
                      selected
                        ? "border-secondary-container bg-secondary-container/15 ring-2 ring-secondary-container/40"
                        : "border-surface-variant bg-surface-container-low hover:border-outline-variant"
                    }`}
                  >
                    <PaymentMethodIcon method={opt.id} selected={selected} />
                    <div className="min-w-0 flex-1">
                      <span className="font-semibold text-on-surface">{opt.label}</span>
                      <p className="text-body-readable mt-0.5 text-xs text-on-surface-variant">{opt.description}</p>
                    </div>
                    {selected && (
                      <span className="material-symbols-outlined ml-auto text-secondary">
                        check_circle
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

        </div>
      </CheckoutShell>
    </>
  );
}
