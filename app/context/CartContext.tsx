"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartLine, MenuItem } from "@/lib/types";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  total: number;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  const addItem = useCallback((item: MenuItem) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.item.id === item.id);
      if (existing) {
        return prev.map((line) =>
          line.item.id === item.id
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setLines((prev) => prev.filter((line) => line.item.id !== itemId));
  }, []);

  const increment = useCallback((itemId: string) => {
    setLines((prev) =>
      prev.map((line) =>
        line.item.id === itemId
          ? { ...line, quantity: line.quantity + 1 }
          : line,
      ),
    );
  }, []);

  const decrement = useCallback((itemId: string) => {
    setLines((prev) =>
      prev
        .map((line) =>
          line.item.id === itemId
            ? { ...line, quantity: line.quantity - 1 }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );

  const total = useMemo(
    () =>
      lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      total,
      addItem,
      removeItem,
      increment,
      decrement,
      clearCart,
    }),
    [
      lines,
      itemCount,
      total,
      addItem,
      removeItem,
      increment,
      decrement,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
