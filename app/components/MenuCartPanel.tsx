"use client";

import { CartCheckoutFooter } from "@/app/components/CartCheckoutFooter";
import { CartItemRow } from "@/app/components/CartItemRow";
import { useCart } from "@/app/context/CartContext";

interface MenuCartPanelProps {
  className?: string;
  onClose?: () => void;
}

/** Cart + checkout on the menu page (desktop sidebar or mobile sheet). */
export function MenuCartPanel({ className = "", onClose }: MenuCartPanelProps) {
  const { lines, itemCount } = useCart();

  return (
    <div
      className={`flex min-h-0 flex-col rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-[0_12px_32px_rgba(29,29,53,0.12)] ${className}`}
    >
      <div className="border-b border-surface-variant px-lg py-md">
        <h2 className="text-headline-md font-bold text-on-surface">Your Cart</h2>
        <p className="text-xs text-on-surface-variant">
          {itemCount} item{itemCount === 1 ? "" : "s"}
        </p>
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
        <CartCheckoutFooter onNavigate={onClose} />
      </div>
    </div>
  );
}
