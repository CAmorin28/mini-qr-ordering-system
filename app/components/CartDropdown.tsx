"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CartItemRow } from "@/app/components/CartItemRow";
import { useCart } from "@/app/context/CartContext";
import { useTableSession } from "@/app/context/TableSessionContext";
import { computeSubtotal } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import { CHECKOUT_PAGE_PATH } from "@/lib/menu-url";

interface CartDropdownProps {
  open: boolean;
  onClose: () => void;
}

export function CartDropdown({ open, onClose }: CartDropdownProps) {
  const { lines, itemCount } = useCart();
  const { pathWithSession, hasTableSession } = useTableSession();
  const panelRef = useRef<HTMLDivElement>(null);
  const subtotal = computeSubtotal(lines);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if ((target as Element).closest?.("[data-cart-trigger]")) return;
      onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Close cart"
        className="fixed inset-0 z-[55] bg-primary/20 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Your cart"
        className="cart-dropdown-panel fixed z-[60] flex max-h-[min(85dvh,640px)] w-[min(calc(100vw-2rem),420px)] flex-col overflow-hidden rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-[0_20px_50px_rgba(5,5,27,0.18)] max-md:inset-x-4 max-md:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] max-md:top-auto md:right-6 md:top-[calc(var(--header-height)+env(safe-area-inset-top,0px)+8px)] xl:right-12"
      >
        <div className="flex items-center justify-between border-b border-surface-variant px-lg py-md">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface">Your Cart</h2>
            <p className="text-xs text-on-surface-variant">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target rounded-lg p-2 text-on-surface-variant hover:bg-surface-container"
            aria-label="Close cart panel"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="cart-scroll flex-1 space-y-sm overflow-y-auto px-lg py-md">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="material-symbols-outlined text-[48px] text-surface-variant">
                shopping_basket
              </span>
              <p className="text-on-surface-variant">
                Your cart is empty. Add items from the menu.
              </p>
            </div>
          ) : (
            lines.map((line) => (
              <CartItemRow key={line.item.id} line={line} variant="dropdown" />
            ))
          )}
        </div>

        <div className="border-t border-surface-variant bg-surface-container-low px-lg py-md">
          <div className="mb-md flex items-center justify-between">
            <span className="text-sm font-medium text-on-surface-variant">Subtotal</span>
            <span className="text-xl font-bold text-secondary">{formatPrice(subtotal)}</span>
          </div>
          {hasTableSession ? (
            <Link
              href={pathWithSession(CHECKOUT_PAGE_PATH)}
              onClick={() => {
                if (itemCount > 0) onClose();
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
          ) : (
            <p className="rounded-xl border border-dashed border-surface-variant bg-surface-container-low px-md py-3 text-center text-xs text-on-surface-variant">
              Scan your table QR code to start checkout (dine-in and pick-up).
            </p>
          )}
        </div>
      </div>
    </>
  );
}
