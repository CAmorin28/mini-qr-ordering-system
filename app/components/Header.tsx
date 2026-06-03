"use client";

import Link from "next/link";
import { useState } from "react";
import { CartDropdown } from "@/app/components/CartDropdown";
import { OrderStatusNavButton } from "@/app/components/OrderStatusNavButton";
import { useCart } from "@/app/context/CartContext";
import { useTableSession } from "@/app/context/TableSessionContext";
import { ADMIN_DASHBOARD_PATH, MENU_PAGE_PATH } from "@/lib/menu-url";

interface HeaderProps {
  showCart?: boolean;
  showOrderStatus?: boolean;
  showBackToMenu?: boolean;
  showTableBadge?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Minimal dark bar for the QR display page */
  variant?: "default" | "qr";
}

export function Header({
  showCart = true,
  showOrderStatus = false,
  showBackToMenu = false,
  showTableBadge = false,
  backHref,
  backLabel,
  variant = "default",
}: HeaderProps) {
  const { itemCount } = useCart();
  const { tableLabel, hasTableSession, pathWithSession } = useTableSession();
  const [cartOpen, setCartOpen] = useState(false);
  const isQr = variant === "qr";
  const menuHref = hasTableSession ? pathWithSession(MENU_PAGE_PATH) : MENU_PAGE_PATH;
  const navBackHref = backHref ?? menuHref;
  const navBackLabel = backLabel ?? "Back to menu";

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 flex w-full max-w-full items-center justify-between gap-1.5 pt-[env(safe-area-inset-top,0px)] sm:gap-3 ${
          isQr
            ? "qr-header"
            : "app-header h-[var(--header-height)] bg-primary px-3 text-on-primary shadow-md sm:px-margin-mobile md:px-margin-desktop lg:px-8 xl:px-12"
        }`}
      >
        <div className="flex min-w-0 shrink items-center gap-1.5 sm:gap-3">
          <span
            className={`material-symbols-outlined shrink-0 text-[26px] sm:text-[36px] ${
              isQr ? "qr-header-icon" : "text-secondary-container"
            }`}
          >
            restaurant
          </span>
          <span
            className={`truncate text-base font-bold tracking-tight sm:text-2xl ${
              isQr ? "qr-header-title" : "text-on-primary"
            }`}
          >
            TableBite
          </span>
          {showTableBadge && hasTableSession && !isQr && (
            <span className="hidden rounded-full bg-secondary-container px-2.5 py-1 text-xs font-bold text-on-secondary-container sm:inline">
              {tableLabel}
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          {showTableBadge && hasTableSession && !isQr && (
            <span className="inline rounded-full bg-on-primary/15 px-2 py-1 text-[11px] font-bold text-on-primary sm:hidden">
              {tableLabel}
            </span>
          )}
          {showBackToMenu && (
            <Link
              href={navBackHref}
              aria-label={navBackLabel}
              className={`flex min-h-11 items-center justify-center gap-2 px-2 py-3 text-sm font-semibold transition-opacity hover:opacity-80 active:scale-95 sm:px-3 sm:text-base ${
                isQr
                  ? "qr-header-back"
                  : "rounded-xl border border-on-primary/25 text-on-primary hover:bg-secondary-container hover:text-on-secondary-container"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">
                {backHref === ADMIN_DASHBOARD_PATH ? "admin_panel_settings" : "arrow_back"}
              </span>
              <span className={isQr ? "qr-header-back-label" : "hidden sm:inline"}>
                {navBackLabel}
              </span>
            </Link>
          )}

          {showOrderStatus && !isQr && (
            <OrderStatusNavButton showLabel={!showBackToMenu} />
          )}

          {showCart && !isQr && (
            <button
              type="button"
              data-cart-trigger
              onClick={() => setCartOpen((v) => !v)}
              aria-label={`Cart, ${itemCount} item${itemCount === 1 ? "" : "s"}`}
              aria-expanded={cartOpen}
              className="relative flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-on-primary/20 bg-on-primary/10 px-3 py-2.5 text-on-primary transition-colors hover:bg-secondary-container hover:text-on-secondary-container"
            >
              <span className="material-symbols-outlined text-[24px]">shopping_cart</span>
              {itemCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary-container px-1 text-[11px] font-bold text-on-secondary-container shadow-sm">
                  {itemCount > 99 ? "99+" : itemCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      {showCart && !isQr && (
        <CartDropdown open={cartOpen} onClose={() => setCartOpen(false)} />
      )}
    </>
  );
}
