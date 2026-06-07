"use client";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/shared/format";
import type { MenuItem } from "@/types";

interface FoodCardProps {
  item: MenuItem;
}

export function FoodCard({ item }: FoodCardProps) {
  const { addItem } = useCart();

  return (
    <article className="menu-food-card motion-card group flex h-full min-h-0 flex-col rounded-xl border border-surface-variant bg-surface-container-lowest p-3 shadow-[0px_4px_20px_rgba(29,29,53,0.06)] sm:min-h-[240px] sm:p-lg md:min-h-[260px]">
      <div className="menu-food-card__image mb-md flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-surface-container-low">
        {item.imageUrl ? (
          <img
            alt={item.name}
            src={item.imageUrl}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="menu-food-card__emoji text-4xl sm:text-[56px] md:text-[64px]">
            {item.emoji}
          </span>
        )}
      </div>
      <h3 className="menu-food-card__name line-clamp-2 text-sm font-semibold leading-snug text-on-surface sm:text-headline-sm">
        {item.name}
      </h3>
      <p className="menu-food-card__price mt-1 text-base font-bold text-secondary sm:mt-xs sm:text-price-display">
        {formatPrice(item.price)}
      </p>
      <div className="mt-auto pt-md">
        <button
          type="button"
          onClick={() => addItem(item)}
          className="menu-food-card__add motion-press flex min-h-11 w-full touch-manipulation select-none items-center justify-center gap-xs rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 text-sm font-semibold text-on-surface-variant transition-[color,background-color,border-color,transform] duration-150 hover:border-secondary-container hover:bg-secondary-container/8 hover:text-secondary-container active:scale-[0.97] active:border-secondary-container active:bg-secondary-container/20 active:text-secondary-container sm:py-[12px] sm:text-label-lg"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Add
        </button>
      </div>
    </article>
  );
}
