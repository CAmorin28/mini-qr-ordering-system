"use client";

import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import { MENU_PAGE_PATH, STAFF_QR_PAGE_PATH } from "@/lib/menu-url";

interface HeaderProps {
  onOpenMobileCart?: () => void;
  showCart?: boolean;
  showQrLink?: boolean;
  showBackToMenu?: boolean;
  /** Minimal dark bar for the QR display page */
  variant?: "default" | "qr";
}

export function Header({
  onOpenMobileCart,
  showCart = true,
  showQrLink = false,
  showBackToMenu = false,
  variant = "default",
}: HeaderProps) {
  const { itemCount } = useCart();
  const isQr = variant === "qr";

  return (
    <header
      className={`fixed top-0 z-50 flex w-full items-center justify-between gap-2 sm:gap-3 ${
        isQr
          ? "qr-header"
          : "h-[var(--header-height)] bg-primary px-margin-mobile text-on-primary shadow-md md:px-margin-desktop lg:px-8 xl:px-12"
      }`}
    >
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className={`material-symbols-outlined shrink-0 text-[28px] sm:text-[36px] ${
            isQr ? "qr-header-icon" : "text-secondary-container"
          }`}
        >
          restaurant
        </span>
        <span
          className={`whitespace-nowrap text-lg font-bold tracking-tight sm:text-2xl ${
            isQr ? "qr-header-title" : "text-on-primary"
          }`}
        >
          TableBite
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {showBackToMenu && (
          <Link
            href={MENU_PAGE_PATH}
            aria-label={isQr ? "Back to menu" : undefined}
            className={`flex min-h-11 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold transition-opacity hover:opacity-80 active:scale-95 sm:px-3 sm:text-base ${
              isQr
                ? "qr-header-back"
                : "rounded-xl border border-on-primary/25 text-on-primary hover:bg-secondary-container hover:text-on-secondary-container"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">arrow_back</span>
            <span className={isQr ? "qr-header-back-label" : undefined}>Back to menu</span>
          </Link>
        )}

        {showQrLink && (
          <Link
            href={STAFF_QR_PAGE_PATH}
            className="flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-xl border border-on-primary/25 px-2 py-2.5 text-xs font-semibold text-on-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container sm:gap-2 sm:px-5 sm:py-3 sm:text-base"
          >
            <span className="material-symbols-outlined shrink-0 text-[20px] sm:text-[22px]">
              qr_code_2
            </span>
            <span className="whitespace-nowrap">Show QR</span>
          </Link>
        )}

        {showCart && onOpenMobileCart && (
          <button
            type="button"
            onClick={onOpenMobileCart}
            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
            className="relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-secondary-container px-2.5 py-3 text-sm font-semibold text-on-secondary-container transition-colors hover:bg-secondary hover:text-on-primary sm:px-5 sm:text-base md:hidden"
          >
            <span className="material-symbols-outlined text-[22px]">shopping_cart</span>
            <span className="hidden sm:inline">Cart ({itemCount})</span>
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-bold text-on-primary sm:hidden">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}