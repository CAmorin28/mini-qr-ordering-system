"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CartPanelOverlay } from "@/components/CartPanelOverlay";
import { useOptionalTableSession } from "@/context/TableSessionContext";
import type { CartLine, MenuItem } from "@/types";
import { cartStorageKey } from "@/lib/shared/table-session";

interface CartContextValue {
  lines: CartLine[];
  itemCount: number;
  total: number;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (item: MenuItem) => void;
  removeItem: (itemId: string) => void;
  increment: (itemId: string) => void;
  decrement: (itemId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredCart(tableLetter: string): CartLine[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(cartStorageKey(tableLetter));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartLine[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoredCart(tableLetter: string, lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  if (lines.length === 0) {
    localStorage.removeItem(cartStorageKey(tableLetter));
    return;
  }
  localStorage.setItem(cartStorageKey(tableLetter), JSON.stringify(lines));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const tableSession = useOptionalTableSession();
  const tableLetter = tableSession?.tableLetter ?? "";
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);
  const toggleCart = useCallback(() => setIsCartOpen((open) => !open), []);

  useEffect(() => {
    setLines(readStoredCart(tableLetter));
    setHydrated(true);
  }, [tableLetter]);

  useEffect(() => {
    if (!hydrated) return;
    writeStoredCart(tableLetter, lines);
  }, [lines, tableLetter, hydrated]);

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
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
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
      isCartOpen,
      openCart,
      closeCart,
      toggleCart,
      addItem,
      removeItem,
      increment,
      decrement,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartPanelOverlay />
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
