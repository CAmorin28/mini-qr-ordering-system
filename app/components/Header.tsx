"use client";

import { useCart } from "@/app/context/CartContext";

interface HeaderProps {
  onOpenMobileCart: () => void;
}

export function Header({ onOpenMobileCart }: HeaderProps) {
  const { itemCount } = useCart();

  return (
    <header className="bg-primary text-on-primary fixed top-0 z-50 flex h-[var(--header-height)] w-full items-center justify-between px-margin-mobile shadow-md md:px-margin-desktop lg:px-8 xl:px-12">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-[32px] text-secondary-container sm:text-[36px]">
          restaurant
        </span>
        <span className="text-xl font-bold tracking-tight text-on-primary sm:text-2xl">
          TableBite
        </span>
      </div>
      <button
        type="button"
        onClick={onOpenMobileCart}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary-container px-5 py-3 text-base font-semibold text-on-secondary-container transition-colors hover:bg-secondary hover:text-on-primary md:hidden"
      >
        <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
        <span>Cart ({itemCount})</span>
      </button>
    </header>
  );
}
