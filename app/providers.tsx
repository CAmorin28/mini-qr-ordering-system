"use client";

import { CartProvider } from "@/app/context/CartContext";
import { CheckoutProvider } from "@/app/context/CheckoutContext";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <CheckoutProvider>{children}</CheckoutProvider>
    </CartProvider>
  );
}
