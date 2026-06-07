"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CartCheckoutFooter } from "@/components/CartCheckoutFooter";
import { CartItemRow } from "@/components/CartItemRow";
import { useCart } from "@/context/CartContext";

/** Single cart panel (portal) — only one instance is mounted app-wide. */
export function CartPanelOverlay() {
  const { lines, itemCount, isCartOpen, closeCart } = useCart();
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  useEffect(() => {
    if (!isCartOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isCartOpen]);

  if (typeof document === "undefined" || !isCartOpen) return null;

  return createPortal(
    <>
      <div
        aria-hidden
        className="cart-dropdown-backdrop pointer-events-none fixed inset-0 z-[55] bg-primary/20 backdrop-blur-[2px] md:bg-transparent md:backdrop-blur-none"
      />
      <div
        ref={panelRef}
        id="cart-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="cart-dropdown-panel fixed z-[60] flex max-h-[min(85dvh,640px)] w-[calc(100%-2rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-[0_20px_50px_rgba(5,5,27,0.18)] max-md:inset-x-4 max-md:bottom-[max(1rem,env(safe-area-inset-bottom,0px))] max-md:top-auto md:right-6 md:left-auto md:w-[min(420px,calc(100%-3rem))] md:top-[calc(var(--header-height)+env(safe-area-inset-top,0px)+8px)] xl:right-12"
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
            onClick={closeCart}
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
          <CartCheckoutFooter onNavigate={closeCart} />
        </div>
      </div>
    </>,
    document.body,
  );
}
