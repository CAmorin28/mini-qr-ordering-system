"use client";

import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

interface HeaderProps {
  onOpenMobileCart?: () => void;
  showCart?: boolean;
  showQrLink?: boolean;
  showBackToMenu?: boolean;
}

export function Header({
  onOpenMobileCart,
  showCart = true,
  showQrLink = false,
  showBackToMenu = false,
}: HeaderProps) {
  const { itemCount } = useCart();

  return (
    <header className="bg-primary text-on-primary fixed top-0 z-50 flex h-[var(--header-height)] w-full items-center justify-between gap-3 px-margin-mobile shadow-md md:px-margin-desktop lg:px-8 xl:px-12">
      <div className="flex min-w-0 items-center gap-3">
        <span className="material-symbols-outlined shrink-0 text-[32px] text-secondary-container sm:text-[36px]">
          restaurant
        </span>
        <span className="truncate text-xl font-bold tracking-tight text-on-primary sm:text-2xl">
          TableBite
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {showBackToMenu && (
          <Link
            href="/"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-on-primary/25 px-3 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container sm:px-5 sm:text-base"
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            <span>Back to menu</span>
          </Link>
        )}

        {showQrLink && (
          <Link
            href="/qr"
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-on-primary/25 px-3 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container sm:px-5 sm:text-base"
          >
            <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
            <span>Show QR</span>
          </Link>
        )}

        {showCart && onOpenMobileCart && (
          <button
            type="button"
            onClick={onOpenMobileCart}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary-container px-3 py-3 text-sm font-semibold text-on-secondary-container transition-colors hover:bg-secondary hover:text-on-primary sm:px-5 sm:text-base md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
            <span>Cart ({itemCount})</span>
          </button>
        )}
      </div>
    </header>
  );
}