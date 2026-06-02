"use client";

import { PaymentMethodIcon } from "@/app/components/PaymentMethodIcon";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-primary/50 p-margin-mobile backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="payment-processing-title"
      aria-busy="true"
    >
      <div className="w-full max-w-[min(100%,24rem)] rounded-2xl border border-surface-variant bg-surface-container-lowest p-xl shadow-[0_24px_64px_rgba(5,5,27,0.25)]">
        <div className="flex flex-col items-center text-center">
          <PaymentMethodIcon method={paymentMethod} selected />
          <div className="payment-spinner mt-lg" aria-hidden />
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
