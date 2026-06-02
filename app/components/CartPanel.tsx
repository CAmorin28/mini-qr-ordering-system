"use client";

import { useState } from "react";
import { useCart } from "@/app/context/CartContext";
import { CartItemRow } from "@/app/components/CartItemRow";
import { submitOrder } from "@/lib/api";
import { formatPrice } from "@/lib/format";

interface CartPanelProps {
  className?: string;
  onClose?: () => void;
}

export function CartPanel({ className = "", onClose }: CartPanelProps) {
  const { lines, total, itemCount, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (itemCount === 0) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const result = await submitOrder({
        items: lines.map((line) => ({
          menuItemId: line.item.id,
          quantity: line.quantity,
        })),
        total,
      });
      setMessage(`${result.message} (${result.orderId})`);
      clearCart();
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`flex flex-col rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg shadow-[0px_12px_32px_rgba(29,29,53,0.12)] ${className}`}
    >
      <div className="mb-md border-b border-surface-variant pb-md">
        <h2 className="text-headline-md font-semibold text-on-surface">
          Your Cart
        </h2>
      </div>

      <div className="cart-scroll flex-1 space-y-lg overflow-y-auto pr-sm">
        {lines.length === 0 ? (
          <p className="py-lg text-center text-on-surface-variant">
            Your cart is empty. Add items from the menu.
          </p>
        ) : (
          lines.map((line) => (
            <CartItemRow key={line.item.id} line={line} />
          ))
        )}
      </div>

      <div className="mt-auto border-t border-surface-variant pt-lg">
        {message && (
          <p className="mb-sm text-sm text-secondary">{message}</p>
        )}
        {error && (
          <p className="mb-sm text-sm text-error">
            {error}
            <span className="mt-xs block text-on-surface-variant">
              Run npm run dev and try again.
            </span>
          </p>
        )}
        <div className="mb-md flex items-end justify-between">
          <span className="text-body-lg text-on-surface-variant">Total</span>
          <span className="text-[24px] font-bold leading-none text-secondary">
            {formatPrice(total)}
          </span>
        </div>
        <button
          type="button"
          disabled={itemCount === 0 || submitting}
          onClick={handleCheckout}
          className="flex w-full items-center justify-center rounded-xl bg-primary py-sm text-headline-sm font-semibold text-on-primary shadow-sm transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Placing order…" : "View Cart"}
        </button>
      </div>
    </div>
  );
}
