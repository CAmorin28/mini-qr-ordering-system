"use client";

import {
  getMockPaymentMode,
  setMockPaymentMode,
  type MockPaymentMode,
} from "@/lib/mock-payment";
import { useEffect, useState } from "react";

const MODES: { id: MockPaymentMode; label: string }[] = [
  { id: "random", label: "Random" },
  { id: "success", label: "Force success" },
  { id: "failure", label: "Force fail" },
];

/** Shown on all environments so demo payment can be tested on Vercel. */
export function MockPaymentDevControls() {
  const [mode, setMode] = useState<MockPaymentMode>("random");

  useEffect(() => {
    setMode(getMockPaymentMode());
  }, []);

  return (
    <div className="rounded-xl border border-dashed border-secondary-container/60 bg-secondary-container/10 p-md">
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Payment simulation (demo)
      </p>
      <p className="mt-1 text-xs text-on-surface-variant">
        Not a real payment gateway. Choose an outcome before Pay now / Place order.
      </p>
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
