"use client";

import {
  getMockPaymentMode,
  setMockPaymentMode,
  type MockPaymentMode,
} from "@/lib/mock-payment";
import type { PaymentMethod } from "@/lib/types";
import { useEffect, useState } from "react";

const MODES: { id: MockPaymentMode; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "success", label: "Force success" },
  { id: "failure", label: "Force fail" },
];

interface MockPaymentDevControlsProps {
  paymentMethod: PaymentMethod | null;
}

/** Shown on all environments so demo payment can be tested on Vercel. */
export function MockPaymentDevControls({ paymentMethod }: MockPaymentDevControlsProps) {
  const [mode, setMode] = useState<MockPaymentMode>("random");
  const appliesToCheckout = paymentMethod === "gcash";

  useEffect(() => {
    setMode(getMockPaymentMode());
  }, []);

  return (
    <div className="rounded-xl border border-dashed border-secondary-container/60 bg-secondary-container/10 p-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Payment simulation (demo)
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Not a real payment gateway. Choose an outcome before Pay now. Cash on Delivery
        always places the order; success/fail applies to GCash only.
      </p>
      {!appliesToCheckout && paymentMethod === "cod" && (
        <p className="mt-1 text-xs font-medium text-on-surface-variant/80">
          Current method: COD — simulation controls are saved for when you switch to GCash.
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMockPaymentMode(m.id);
              setMode(m.id);
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              mode === m.id
                ? "bg-secondary-container text-on-secondary-container"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  );
}
