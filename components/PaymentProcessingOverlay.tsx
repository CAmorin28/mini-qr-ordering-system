"use client";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PaymentMethodIcon } from "@/components/PaymentMethodIcon";
import { formatPrice } from "@/lib/shared/format";
import type { PaymentMethod } from "@/types";

interface PaymentProcessingOverlayProps {
  paymentMethod: PaymentMethod;
  amount: number;
}

export function PaymentProcessingOverlay({
  paymentMethod,
  amount,
}: PaymentProcessingOverlayProps) {
  const isWallet = paymentMethod === "gcash";

  return (
    <div
      className="cart-dropdown-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 p-margin-mobile pb-[max(var(--spacing-margin-mobile),env(safe-area-inset-bottom,0px))] pt-[max(var(--spacing-margin-mobile),env(safe-area-inset-top,0px))] backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-processing-title"
      aria-busy="true"
    >
      <div className="admin-order-modal-panel w-full max-w-[min(100%,24rem)] rounded-2xl border border-surface-variant bg-surface-container-lowest p-xl shadow-[0_24px_64px_rgba(5,5,27,0.25)]">
        <div className="flex flex-col items-center text-center">
          <PaymentMethodIcon method={paymentMethod} selected />
          <LoadingSpinner size="lg" className="mt-lg" />
          <h2
            id="payment-processing-title"
            className="mt-lg text-lg font-bold text-on-surface"
          >
            {isWallet ? "Processing payment…" : "Placing your order…"}
          </h2>
          <p className="mt-2 text-sm text-on-surface-variant">
            {isWallet
              ? "Simulating GCash payment. Please wait."
              : "Confirming your pay-at-counter order."}
          </p>
          <p className="mt-md text-xl font-bold text-secondary">
            {formatPrice(amount)}
          </p>
          <p className="mt-4 text-xs text-on-surface-variant">
            Simulation only — not a real charge
          </p>
        </div>
      </div>
    </div>
  );
}
