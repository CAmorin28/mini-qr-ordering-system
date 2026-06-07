"use client";

import { useCart } from "@/context/CartContext";
import { lineSubtotal } from "@/lib/shared/checkout";
import { formatPrice } from "@/lib/shared/format";
import type { CartLine } from "@/types";
import { QuantityControls } from "@/components/QuantityControls";

interface CheckoutLineItemProps {
  line: CartLine;
}

export function CheckoutLineItem({ line }: CheckoutLineItemProps) {
  const { increment, decrement, removeItem } = useCart();
  const { item, quantity } = line;

  return (
    <article className="checkout-line-item grid grid-cols-[5rem_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-[0_4px_16px_rgba(29,29,53,0.05)] sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:p-lg lg:grid-cols-[5.5rem_minmax(0,1fr)_auto_auto] lg:items-center lg:gap-x-5 lg:gap-y-0 lg:p-md xl:gap-x-6 xl:p-lg">
      <div className="checkout-line-item__thumb row-span-2 h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-surface-container-low sm:h-[5.5rem] sm:w-[5.5rem] lg:row-span-1 lg:h-[4.5rem] lg:w-[4.5rem]">
        {item.imageUrl ? (
          <img
            alt={item.name}
            src={item.imageUrl}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl sm:text-4xl">
            {item.emoji}
          </div>
        )}
      </div>
      <div className="checkout-line-item__info flex min-w-0 items-start justify-between gap-2 lg:col-start-2 lg:items-center lg:justify-start lg:gap-4">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-on-surface sm:text-lg">{item.name}</h3>
          <p className="mt-0.5 text-sm text-on-surface-variant">
            {formatPrice(item.price)} each
          </p>
        </div>
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="touch-target shrink-0 rounded-lg p-1.5 text-error hover:bg-error-container lg:order-3"
          aria-label={`Remove ${item.name}`}
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
      </div>
      <div className="checkout-line-item__actions flex min-w-0 items-center justify-between gap-3 lg:contents">
        <div className="checkout-line-item__controls flex shrink-0 lg:col-start-3 lg:justify-center">
          <QuantityControls
            className="checkout-line-qty shrink-0"
            quantity={quantity}
            onIncrement={() => increment(item.id)}
            onDecrement={() => decrement(item.id)}
          />
        </div>
        <span className="checkout-line-item__total text-lg font-bold tabular-nums text-secondary sm:text-xl lg:col-start-4 lg:min-w-[5.5rem] lg:text-right lg:text-xl">
          {formatPrice(lineSubtotal(line))}
        </span>
      </div>
    </article>
  );
}
