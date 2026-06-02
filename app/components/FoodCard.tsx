"use client";

import { useCart } from "@/app/context/CartContext";
import { formatPrice } from "@/lib/format";
import type { MenuItem } from "@/lib/types";

interface FoodCardProps {
  item: MenuItem;
}

export function FoodCard({ item }: FoodCardProps) {
  const { addItem } = useCart();

  return (
    <article className="group flex h-full min-h-[280px] flex-col rounded-xl border border-surface-variant bg-surface-container-lowest p-lg shadow-[0px_4px_20px_rgba(29,29,53,0.06)]">
      <div className="mb-md flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-surface-container-low">
        {item.imageUrl ? (
          <img
            alt={item.name}
            src={item.imageUrl}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-[64px]">{item.emoji}</span>
        )}
      </div>
      <h3 className="truncate text-headline-sm font-semibold text-on-surface">
        {item.name}
      </h3>
      <p className="mt-xs text-price-display font-bold text-secondary">
        {formatPrice(item.price)}
      </p>
      <div className="mt-auto pt-md">
        <button
          type="button"
          onClick={() => addItem(item)}
          className="flex w-full items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest py-[12px] text-label-lg font-semibold text-on-surface-variant transition-colors hover:border-secondary-container hover:text-secondary-container"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>
    </article>
  );
}
