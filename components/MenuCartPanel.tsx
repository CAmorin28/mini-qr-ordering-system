"use client";

import { CartCheckoutFooter } from "@/components/CartCheckoutFooter";
import { CartItemRow } from "@/components/CartItemRow";
import { useCart } from "@/context/CartContext";

interface MenuCartPanelProps {
  className?: string;
  onClose?: () => void;
}

/** Cart + checkout on the menu page (desktop sidebar — Foodpanda-style sticky column). */
export function MenuCartPanel({ className = "", onClose }: MenuCartPanelProps) {
  const { lines, itemCount } = useCart();
  const isEmpty = lines.length === 0;

  return (
    <div
      className={`menu-cart-panel flex flex-col overflow-hidden rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-[0_8px_28px_rgba(29,29,53,0.1)] ${className}`}
    >
      <div className="menu-cart-header shrink-0 border-b border-surface-variant px-lg py-md">
        <h2 className="menu-cart-title text-headline-md font-bold text-on-surface">Your Cart</h2>
        <p className="menu-cart-meta text-xs text-on-surface-variant">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
      </div>

      <div
        className={`menu-cart-body cart-scroll overflow-y-auto overscroll-contain px-lg ${
          isEmpty ? "menu-cart-body--empty flex flex-col items-center justify-center py-10 text-center" : "py-2"
        }`}
      >
        {isEmpty ? (
          <>
            <span className="material-symbols-outlined text-[48px] text-surface-variant">
              shopping_basket
            </span>
            <p className="mt-3 text-on-surface-variant">
              Your cart is empty. Add items from the menu.
            </p>
          </>
        ) : (
          <ul className="divide-y divide-surface-variant">
            {lines.map((line) => (
              <li key={line.item.id} className="py-1">
                <CartItemRow line={line} variant="sidebar" />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="menu-cart-footer shrink-0 border-t border-surface-variant bg-surface-container-lowest px-lg py-md shadow-[0_-6px_16px_rgba(29,29,53,0.06)]">
        <CartCheckoutFooter className="menu-cart-checkout-wrap" onNavigate={onClose} />
      </div>
    </div>
  );
}
