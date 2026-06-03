"use client";

import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { useTableSession } from "@/app/context/TableSessionContext";
import { computeSubtotal } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { CHECKOUT_PAGE_PATH } from "@/lib/menu-url";

interface CartCheckoutFooterProps {
  onNavigate?: () => void;
  className?: string;
}

/** Subtotal + checkout CTA (appends ?table= when a QR session is active). */
export function CartCheckoutFooter({ onNavigate, className = "" }: CartCheckoutFooterProps) {
  const { lines, itemCount } = useCart();
  const { pathWithSession } = useTableSession();
  const subtotal = computeSubtotal(lines);

  return (
    <div className={className}>
      <div className="price-row mb-md items-center">
        <span className="text-sm font-medium text-on-surface-variant">Subtotal</span>
        <span className="text-xl font-bold text-secondary">{formatPrice(subtotal)}</span>
      </div>
      <Link
        href={pathWithSession(CHECKOUT_PAGE_PATH)}
        onClick={() => {
          if (itemCount > 0) onNavigate?.();
        }}
        className={`checkout-cta flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl py-3.5 text-headline-sm font-bold transition-all ${
          itemCount === 0
            ? "pointer-events-none cursor-not-allowed bg-surface-variant text-on-surface-variant opacity-60"
            : "bg-primary text-on-primary shadow-md hover:bg-primary-container active:scale-[0.99]"
        }`}
        aria-disabled={itemCount === 0}
      >
        Proceed to Checkout
        <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
      </Link>
    </div>
  );
}
