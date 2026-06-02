"use client";

import { useCart } from "@/app/context/CartContext";
import { lineSubtotal } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/types";
import { QuantityControls } from "@/app/components/QuantityControls";

interface CheckoutLineItemProps {
  line: CartLine;
}

export function CheckoutLineItem({ line }: CheckoutLineItemProps) {
  const { increment, decrement, removeItem } = useCart();
  const { item, quantity } = line;

  return (
    <article className="checkout-line-item flex gap-md rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-[0_4px_16px_rgba(29,29,53,0.05)]">
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container-low">
        {item.imageUrl ? (
          <img
            alt={item.name}
            src={item.imageUrl}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl">
            {item.emoji}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-on-surface">{item.name}</h3>
            <p className="mt-0.5 text-sm text-on-surface-variant">
              {formatPrice(item.price)} each
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            className="shrink-0 rounded-lg p-1.5 text-error hover:bg-error-container"
            aria-label={`Remove ${item.name}`}
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <QuantityControls
            quantity={quantity}
            onIncrement={() => increment(item.id)}
            onDecrement={() => decrement(item.id)}
          />
          <span className="text-lg font-bold text-secondary">
            {formatPrice(lineSubtotal(line))}
          </span>
        </div>
      </div>
    </article>
  );
}
