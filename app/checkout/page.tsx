"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TableSessionBanner } from "@/app/components/TableSessionBanner";
import { CheckoutLineItem } from "@/app/components/CheckoutLineItem";
import { CheckoutShell } from "@/app/components/CheckoutShell";
import { PriceBreakdown } from "@/app/components/PriceBreakdown";
import { useCart } from "@/app/context/CartContext";
import { useCheckout } from "@/app/context/CheckoutContext";
import { useTableSession } from "@/app/context/TableSessionContext";
import { computeSubtotal } from "@/lib/checkout";
import { CHECKOUT_REVIEW_PATH, MENU_PAGE_PATH } from "@/lib/menu-url";

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, itemCount } = useCart();
  const { cutlery, setCutlery } = useCheckout();
  const { pathWithSession, hasTableSession } = useTableSession();
  const subtotal = computeSubtotal(lines);
  const menuPath = pathWithSession(MENU_PAGE_PATH);

  useEffect(() => {
    if (itemCount === 0) {
      router.replace(menuPath);
    }
  }, [itemCount, router, menuPath]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <CheckoutShell
      step={1}
      title="Checkout"
      subtitle="Review your order before payment."
    >
      <TableSessionBanner />

      <section className="space-y-md">
        <h2 className="text-headline-md font-semibold text-on-surface">Order summary</h2>
        <div className="space-y-md">
          {lines.map((line) => (
            <CheckoutLineItem key={line.item.id} line={line} />
          ))}
        </div>
      </section>

      <section className="mt-lg rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg">
        <h2 className="mb-md text-headline-md font-semibold text-on-surface">
          Price breakdown
        </h2>
        <label className="mb-md flex cursor-pointer items-center gap-3 rounded-xl border border-surface-variant bg-surface-container-low px-md py-sm transition-colors has-[:checked]:border-secondary-container has-[:checked]:bg-secondary-container/10">
          <input
            type="checkbox"
            checked={cutlery}
            onChange={(e) => setCutlery(e.target.checked)}
            className="h-5 min-h-5 w-5 min-w-5 shrink-0 rounded border-outline-variant accent-secondary"
          />
          <div>
            <span className="font-semibold text-on-surface">Add cutlery</span>
            <p className="text-xs text-on-surface-variant">Optional — no extra charge</p>
          </div>
          <span className="material-symbols-outlined ml-auto text-secondary">restaurant</span>
        </label>
        <PriceBreakdown subtotal={subtotal} showCutleryNote cutlery={cutlery} />
      </section>

      <div className="checkout-actions mt-lg">
        <Link
          href={menuPath}
          className="checkout-actions-secondary rounded-xl border border-outline-variant px-lg py-3 text-sm font-semibold text-on-surface-variant hover:bg-surface-container"
        >
          Add more items
        </Link>
        {hasTableSession ? (
          <Link
            href={pathWithSession(CHECKOUT_REVIEW_PATH)}
            className="checkout-cta checkout-actions-primary gap-2 rounded-xl bg-primary px-lg py-3.5 text-headline-sm font-bold text-on-primary shadow-md hover:bg-primary-container"
          >
            Continue to payment
            <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
          </Link>
        ) : (
          <span
            className="checkout-actions-primary cursor-not-allowed gap-2 rounded-xl bg-surface-variant px-lg py-3.5 text-headline-sm font-bold text-on-surface-variant opacity-60"
            title="Scan your table QR code first"
          >
            Scan table QR to continue
            <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
          </span>
        )}
      </div>
    </CheckoutShell>
  );
}
