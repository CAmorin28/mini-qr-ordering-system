"use client";

import { useCart } from "@/app/context/CartContext";
import { lineSubtotal } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/types";
import { QuantityControls } from "@/app/components/QuantityControls";

interface CartItemRowProps {
  line: CartLine;
  variant?: "default" | "dropdown";
}

export function CartItemRow({ line, variant = "default" }: CartItemRowProps) {
  const { removeItem, increment, decrement } = useCart();
  const { item, quantity } = line;
  const subtotal = lineSubtotal(line);
  const isDropdown = variant === "dropdown";

  return (
    <div
      className={`flex gap-md ${isDropdown ? "rounded-xl border border-surface-variant/80 bg-surface-container-low p-sm" : ""}`}
    >
      <div
        className={`shrink-0 overflow-hidden rounded-lg bg-surface-container-low ${
          isDropdown ? "h-14 w-14" : "h-16 w-16"
        }`}
      >
        {item.imageUrl ? (
          <img
            alt={item.name}
            src={item.imageUrl}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl">
            {item.emoji}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="line-clamp-2 text-label-lg font-semibold leading-snug text-on-surface">
          {item.name}
        </h4>
        <p className="mt-0.5 text-xs text-on-surface-variant">
          {formatPrice(item.price)} each
        </p>
        {isDropdown && (
          <p className="mt-1 text-sm font-bold text-secondary">
            {formatPrice(subtotal)}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-sm">
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="touch-target rounded-md p-1 text-error transition-colors hover:bg-error-container"
          title="Remove item"
          aria-label={`Remove ${item.name}`}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
        <QuantityControls
          size={isDropdown ? "sm" : "md"}
          quantity={quantity}
          onIncrement={() => increment(item.id)}
          onDecrement={() => decrement(item.id)}
        />
      </div>
    </div>
  );
}
