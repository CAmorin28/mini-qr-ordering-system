"use client";

import Image from "next/image";
import type { PaymentMethod } from "@/lib/types";

interface PaymentMethodIconProps {
  method: PaymentMethod;
  selected?: boolean;
}

export function PaymentMethodIcon({ method, selected }: PaymentMethodIconProps) {
  if (method === "gcash") {
    return (
      <span
        className={`flex h-10 min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg px-1.5 ${
          selected ? "bg-white" : "bg-white ring-1 ring-surface-variant"
        }`}
      >
        <Image
          src="/payment/gcash-logo.svg"
          alt="GCash"
          width={76}
          height={18}
          className="h-[18px] w-auto max-w-[4.5rem] object-contain object-left"
          priority
        />
      </span>
    );
  }

  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
        selected
          ? "bg-secondary-container text-on-secondary-container"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      <span className="material-symbols-outlined">payments</span>
    </span>
  );
}
