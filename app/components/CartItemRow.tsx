"use client";

import { useCart } from "@/app/context/CartContext";
import { formatPrice } from "@/lib/format";
import type { CartLine } from "@/lib/types";

interface CartItemRowProps {
  line: CartLine;
}

export function CartItemRow({ line }: CartItemRowProps) {
  const { removeItem, increment, decrement } = useCart();
  const { item, quantity } = line;

  return (
    <div className="flex items-center gap-md">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-container-low">
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
      <div className="min-w-0 flex-1">
        <h4 className="truncate text-label-lg font-semibold text-on-surface">
          {item.name}
        </h4>
        <p className="mt-xs text-sm font-bold text-secondary">
          {formatPrice(item.price)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-sm">
        <button
          type="button"
          onClick={() => removeItem(item.id)}
          className="rounded-md p-1 text-error transition-colors hover:bg-error-container"
          title="Remove item"
        >
          <span className="material-symbols-outlined text-[20px]">delete</span>
        </button>
        <div className="flex items-center gap-sm rounded-lg bg-surface-container p-1">
          <button
            type="button"
            onClick={() => decrement(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <span className="w-4 text-center text-label-lg font-semibold">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => increment(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-variant"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
