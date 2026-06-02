"use client";

import { useEffect, useState } from "react";
import { fetchOrderById } from "@/lib/api";
import { customerOrderStatusLabel } from "@/lib/order-labels";
import type { PlacedOrder } from "@/lib/types";

const POLL_MS = 4000;

interface OrderStatusTrackerProps {
  orderId: string;
  initialOrder: PlacedOrder;
  onUpdate?: (order: PlacedOrder) => void;
}

export function OrderStatusTracker({
  orderId,
  initialOrder,
  onUpdate,
}: OrderStatusTrackerProps) {
  const [order, setOrder] = useState(initialOrder);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      setRefreshing(true);
      try {
        const latest = await fetchOrderById(orderId);
        if (!cancelled && latest) {
          setOrder(latest);
          onUpdate?.(latest);
        }
      } catch {
        /* keep last known */
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, onUpdate]);

  const label = customerOrderStatusLabel(order);
  const isTerminal =
    order.status === "served" || order.status === "ready_for_pickup";

  return (
    <section
      className="rounded-2xl border border-primary-container/30 bg-surface-container-low p-lg"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Live order status
          </p>
          <p className="mt-1 text-xl font-bold text-on-surface">{label}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Order {order.orderNumber}
            {order.customer.tableLetter ? ` · Table ${order.customer.tableLetter}` : ""}
          </p>
        </div>
        {!isTerminal && (
          <span
            className={`material-symbols-outlined text-secondary ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          >
            {refreshing ? "progress_activity" : "sync"}
          </span>
        )}
      </div>
      {!isTerminal && (
        <p className="mt-3 text-xs text-on-surface-variant">
          Status updates automatically every few seconds.
        </p>
      )}
    </section>
  );
}
