"use client";

import type { ReactNode } from "react";
import { CartProvider } from "@/app/context/CartContext";
import { CheckoutProvider } from "@/app/context/CheckoutContext";
import { TableSessionProvider } from "@/app/context/TableSessionContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TableSessionProvider>
      <CartProvider>
        <CheckoutProvider>
          <div className="customer-viewport flex min-h-dvh w-full min-w-0 max-w-full flex-1 flex-col">
            {children}
          </div>
        </CheckoutProvider>
      </CartProvider>
    </TableSessionProvider>
  );
}
