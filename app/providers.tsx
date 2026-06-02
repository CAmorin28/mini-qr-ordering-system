"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/app/context/CartContext";
import { CheckoutProvider } from "@/app/context/CheckoutContext";
import { TableSessionProvider } from "@/app/context/TableSessionContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TableSessionProvider>
      <CartProvider>
        <CheckoutProvider>{children}</CheckoutProvider>
      </CartProvider>
    </TableSessionProvider>
  );
}
