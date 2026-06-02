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
import { emptyDelivery, useCheckout } from "@/app/context/CheckoutContext";
import {
  computeGrandTotal,
  computeSubtotal,
  lineSubtotal,
  DELIVERY_FEE,
  SERVICE_FEE,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { simulateMockPayment } from "@/lib/mock-payment";
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
import type { PaymentMethod, PaymentStatus } from "@/lib/types";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  description: string;
}[] = [
  {
    id: "gcash",
    label: "GCash",
    description: "Pay via mobile wallet (simulation)",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: "Pay when your order arrives",
  },
];

export default function CheckoutReviewClient() {
  const router = useRouter();
  const { lines, itemCount } = useCart();
  const { cutlery, delivery, paymentMethod, setDelivery, setPaymentMethod } =
    useCheckout();

  const [form, setForm] = useState(delivery ?? emptyDelivery);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const placedSuccessfully = useRef(false);

  const subtotal = computeSubtotal(lines);
  const grandTotal = computeGrandTotal(subtotal);
  const isPayNow = paymentMethod === "gcash";

  useEffect(() => {
    if (itemCount === 0 && !processingPayment && !placedSuccessfully.current) {
      router.replace(MENU_PAGE_PATH);
    }
  }, [itemCount, router, processingPayment]);

  if (itemCount === 0 && !processingPayment) {
    return null;
  }

  async function handlePlaceOrder(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setPaymentError(null);

    if (!form.fullName.trim() || !form.contactNumber.trim() || !form.address.trim()) {
      setFormError("Please fill in your name, contact number, and delivery address.");
      return;
    }
    if (!paymentMethod) {
      setFormError("Please select a payment method (GCash or Cash on Delivery).");
      return;
    }

    setDelivery(form);
    setProcessingPayment(true);

    if (paymentMethod === "gcash") {
      const paymentResult = await simulateMockPayment();
      if (!paymentResult.success) {
        setProcessingPayment(false);
        setPaymentError(paymentResult.message);
        return;
      }
    }

    const paymentStatus: PaymentStatus =
      paymentMethod === "gcash" ? "paid" : "pending";

    try {
      const draft = buildPlacedOrder({
        orderId: generateOrderId(),
        lines,
        cutlery,
        paymentMethod,
        delivery: form,
        status: "confirmed",
        paymentStatus,
      });

      const placed = await placeOrderWithSimulation(draft);
      saveOrder(placed);
      setPendingOrder(placed);
      placedSuccessfully.current = true;
      router.push(checkoutConfirmationPath(placed.orderId));
    } catch (err) {
      placedSuccessfully.current = false;
      setProcessingPayment(false);
      setPaymentError(
        err instanceof Error ? err.message : "Could not complete your order.",
      );
    }
  }

  function handleRetryPayment() {
    setPaymentError(null);
  }

  return (
    <>
      {processingPayment && paymentMethod && (
        <PaymentProcessingOverlay
          paymentMethod={paymentMethod}
          amount={grandTotal}
        />
      )}

      <CheckoutShell
        step={2}
        title="Review payment & address"
        subtitle="Confirm delivery details, then pay to complete your order."
      >
        <form onSubmit={handlePlaceOrder} className="space-y-lg">
          <MockPaymentDevControls paymentMethod={paymentMethod} />

          <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg">
            <h2 className="mb-md flex items-center gap-2 text-headline-md font-semibold">
              <span className="material-symbols-outlined text-secondary">local_shipping</span>
              Delivery information
            </h2>
            <div className="grid gap-md sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Full name
                </span>
                <input
                  required
                  disabled={processingPayment}
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="checkout-input w-full"
                  placeholder="Juan Dela Cruz"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Contact number
                </span>
                <input
                  required
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
                  Complete delivery address
                </span>
                <textarea
                  required
                  disabled={processingPayment}
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="checkout-input w-full resize-none"
                  placeholder="Unit / street / barangay / city"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm font-medium text-on-surface-variant">
                  Additional notes (optional)
                </span>
                <textarea
                  disabled={processingPayment}
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="checkout-input w-full resize-none"
                  placeholder="Gate code, landmarks, etc."
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
                    className={`flex items-start gap-3 rounded-xl border p-md text-left transition-all disabled:opacity-60 ${
                      selected
                        ? "border-secondary-container bg-secondary-container/15 ring-2 ring-secondary-container/40"
                        : "border-surface-variant bg-surface-container-low hover:border-outline-variant"
                    }`}
                  >
                    <PaymentMethodIcon method={opt.id} selected={selected} />
                    <div>
                      <span className="font-semibold text-on-surface">{opt.label}</span>
                      <p className="mt-0.5 text-xs text-on-surface-variant">{opt.description}</p>
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

          <section className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg">
            <h2 className="mb-md text-headline-md font-semibold">Order review</h2>
            <ul className="mb-md space-y-2 border-b border-surface-variant pb-md">
              {lines.map((line) => (
                <li
                  key={line.item.id}
                  className="flex justify-between gap-2 text-sm text-on-surface-variant"
                >
                  <span>
                    {line.item.name}{" "}
                    <span className="text-on-surface">× {line.quantity}</span>
                  </span>
                  <span className="shrink-0 font-medium text-on-surface">
                    {formatPrice(lineSubtotal(line))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="space-y-1 text-sm text-on-surface-variant">
              <div className="flex justify-between">
                <span>Delivery fee</span>
                <span>{formatPrice(DELIVERY_FEE)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service fee</span>
                <span>{formatPrice(SERVICE_FEE)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment</span>
                <span className="font-medium text-on-surface">
                  {paymentMethod
                    ? PAYMENT_OPTIONS.find((p) => p.id === paymentMethod)?.label
                    : "—"}
                </span>
              </div>
            </div>
            <div className="mt-md flex justify-between border-t border-dashed border-surface-variant pt-md">
              <span className="font-semibold text-on-surface">Grand total</span>
              <span className="text-xl font-bold text-secondary">{formatPrice(grandTotal)}</span>
            </div>
          </section>

          {paymentError && (
            <PaymentFailedPanel message={paymentError} onRetry={handleRetryPayment} />
          )}

          {formError && (
            <p className="rounded-lg border border-error bg-error-container px-md py-sm text-sm text-error">
              {formError}
            </p>
          )}

          <div className="flex flex-col gap-sm sm:flex-row sm:justify-between">
            <Link
              href={CHECKOUT_PAGE_PATH}
              className={`inline-flex items-center justify-center rounded-xl border border-outline-variant px-lg py-3 text-sm font-semibold text-on-surface-variant ${
                processingPayment ? "pointer-events-none opacity-50" : ""
              }`}
            >
              Back to summary
            </Link>
            <button
              type="submit"
              disabled={processingPayment}
              className="checkout-cta inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-lg py-3.5 text-headline-sm font-bold text-on-primary shadow-md hover:bg-primary-container disabled:opacity-60"
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
          </div>
        </form>
      </CheckoutShell>
    </>
  );
}
