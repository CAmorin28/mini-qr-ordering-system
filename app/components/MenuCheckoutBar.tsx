"use client";

import { CartCheckoutFooter } from "@/app/components/CartCheckoutFooter";
import { useCart } from "@/app/context/CartContext";

/** Sticky checkout bar on the menu page when the cart has items (mobile / tablet). */
export function MenuCheckoutBar() {
  const { itemCount } = useCart();

  if (itemCount === 0) return null;

  return (
    <div className="menu-checkout-bar fixed inset-x-0 bottom-0 z-40 box-border w-full max-w-full border-t border-surface-variant bg-surface-container-lowest px-margin-mobile py-md shadow-[0_-8px_24px_rgba(5,5,27,0.1)] pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:hidden">
      <CartCheckoutFooter />
    </div>
  );
}
