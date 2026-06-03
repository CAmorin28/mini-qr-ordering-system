"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoadingSpinner } from "@/app/components/ui/LoadingSpinner";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import {
  afterCustomerOrderCompleted,
  clearTableCustomerSession,
} from "@/lib/customer-table-session";
import { isCompletedOrder } from "@/lib/order-completion";
import { customerOrderStatusLabel } from "@/lib/order-labels";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { listOrders } from "@/lib/order-history";
import { isSupabaseRealtimeConfigured } from "@/lib/supabase/config";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

const FALLBACK_POLL_MS = 8000;

interface OrderStatusTrackerProps {
  orderId: string;
  initialOrder: PlacedOrder;
  onUpdate?: (order: PlacedOrder) => void;
  /** Called when staff completes this table visit and the QR session is cleared. */
  onVisitEnded?: () => void;
}

export function OrderStatusTracker({
  orderId,
  initialOrder,
  onUpdate,
  onVisitEnded,
}: OrderStatusTrackerProps) {
  const [order, setOrder] = useState(initialOrder);
  const [refreshing, setRefreshing] = useState(false);
  const sessionCleared = useRef(false);
  const realtimeOn = isSupabaseRealtimeConfigured();

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  const applyLatest = useCallback(
    async (latest: PlacedOrder) => {
      setOrder(latest);
      onUpdate?.(latest);
      if (isCompletedOrder(latest) && !sessionCleared.current) {
        sessionCleared.current = true;
        const table = normalizeTableLetter(latest.customer.tableLetter);
        try {
          let remaining: PlacedOrder[];
          if (table) {
            const fromApi = await fetchOrderHistory(table);
            remaining = activePlacedOrdersForTable(fromApi, table);
          } else {
            remaining = activePlacedOrdersForTable(listOrders(""), "");
          }
          afterCustomerOrderCompleted(latest, remaining);
          if (remaining.length === 0) {
            onVisitEnded?.();
          }
        } catch {
          if (table) {
            clearTableCustomerSession(table);
          }
          onVisitEnded?.();
        }
      }
    },
    [onUpdate, onVisitEnded],
  );

  const pollLatest = useCallback(async () => {
    setRefreshing(true);
    try {
      const latest = await fetchOrderById(orderId);
      if (latest) {
        await applyLatest(latest);
      }
    } catch {
      /* keep last known */
    } finally {
      setRefreshing(false);
    }
  }, [orderId, applyLatest]);

  useEffect(() => {
    if (isCompletedOrder(initialOrder)) {
      void applyLatest(initialOrder);
    }
  }, [initialOrder, applyLatest]);

  useOrdersRealtime(
    { mode: "order", orderId },
    {
      onUpsert: (latest) => {
        void applyLatest(latest);
      },
    },
    {
      enabled: true,
      fallbackPoll: pollLatest,
    },
  );

  useEffect(() => {
    void pollLatest();
  }, [orderId, pollLatest]);

  useEffect(() => {
    if (realtimeOn) return;
    const timer = window.setInterval(() => {
      void pollLatest();
    }, FALLBACK_POLL_MS);
    return () => window.clearInterval(timer);
  }, [realtimeOn, pollLatest]);

  const visitComplete = isCompletedOrder(order);
  const label = visitComplete
    ? "Visit complete — thank you!"
    : customerOrderStatusLabel(order);
  const isTerminal =
    visitComplete ||
    order.status === "served" ||
    order.status === "ready_for_pickup";

  return (
    <section
      className="rounded-2xl border border-primary-container/30 bg-surface-container-low p-lg"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {visitComplete ? "Order complete" : "Live order status"}
          </p>
          <p className="mt-1 text-lg font-bold leading-snug text-on-surface sm:text-xl">{label}</p>
          <p className="mt-1 text-sm text-on-surface-variant">
            Order {order.orderNumber}
            {order.customer.tableLetter ? ` · Table ${order.customer.tableLetter}` : ""}
          </p>
        </div>
        {!isTerminal &&
          (refreshing ? (
            <LoadingSpinner size="sm" label="Updating status" />
          ) : (
            <span
              className={`material-symbols-outlined ${realtimeOn ? "text-secondary" : "text-on-surface-variant"}`}
              aria-hidden
            >
              {realtimeOn ? "sensors" : "sync"}
            </span>
          ))}
      </div>
      {visitComplete ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          {order.customer.tableLetter
            ? "Staff marked this visit complete. Your table QR session on this phone has ended — scan the code again when you return or when the next party is seated."
            : "Staff marked your order complete. You can place a new order from the menu anytime."}
        </p>
      ) : !isTerminal ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          {realtimeOn
            ? "Status updates instantly when the kitchen or staff changes your order."
            : "Status updates automatically every few seconds."}
        </p>
      ) : null}
    </section>
  );
}
