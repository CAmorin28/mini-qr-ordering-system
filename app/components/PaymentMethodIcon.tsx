"use client";

import Image from "next/image";
import type { PaymentMethod } from "@/lib/types";

interface PaymentMethodIconProps {
  method: PaymentMethod;
  selected?: boolean;
}

function iconContainerClass(selected: boolean | undefined, sizeClass: string) {
  return [
    "flex shrink-0 items-center justify-center rounded-lg",
    sizeClass,
    selected
      ? "bg-white text-secondary ring-2 ring-secondary-container/50"
      : "bg-white text-on-surface-variant ring-1 ring-surface-variant",
  ].join(" ");
}

export function PaymentMethodIcon({ method, selected }: PaymentMethodIconProps) {
  if (method === "gcash") {
    return (
      <span className={iconContainerClass(selected, "h-10 min-w-[2.75rem] px-1.5")}>
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
    <span className={iconContainerClass(selected, "h-10 w-10")}>
      <span className="material-symbols-outlined">payments</span>
    </span>
  );
}
