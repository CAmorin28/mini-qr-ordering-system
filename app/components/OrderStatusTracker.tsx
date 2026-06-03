"use client";

import { useEffect, useRef, useState } from "react";
import { fetchOrderById, fetchOrderHistory } from "@/lib/api";
import {
  afterCustomerOrderCompleted,
  clearTableCustomerSession,
} from "@/lib/customer-table-session";
import { isCompletedOrder } from "@/lib/order-completion";
import { customerOrderStatusLabel } from "@/lib/order-labels";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { normalizeTableLetter } from "@/lib/table-session";
import type { PlacedOrder } from "@/lib/types";

const POLL_MS = 4000;

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

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    let cancelled = false;

    async function handleCompletedVisit(latest: PlacedOrder) {
      if (sessionCleared.current) return;
      sessionCleared.current = true;
      const table = normalizeTableLetter(latest.customer.tableLetter);
      try {
        const fromApi = table ? await fetchOrderHistory(table) : [];
        const remaining = table
          ? activePlacedOrdersForTable(fromApi, table)
          : [];
        afterCustomerOrderCompleted(latest, remaining);
        if (remaining.length === 0) {
          onVisitEnded?.();
        }
      } catch {
        if (table) clearTableCustomerSession(table);
        onVisitEnded?.();
      }
    }

    async function poll() {
      setRefreshing(true);
      try {
        const latest = await fetchOrderById(orderId);
        if (!cancelled && latest) {
          setOrder(latest);
          onUpdate?.(latest);
          if (isCompletedOrder(latest)) {
            await handleCompletedVisit(latest);
          }
        }
      } catch {
        /* keep last known */
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    }

    if (isCompletedOrder(initialOrder)) {
      void handleCompletedVisit(initialOrder);
    }

    poll();
    const timer = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [orderId, onUpdate, onVisitEnded, initialOrder]);

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
            {visitComplete ? "Table visit ended" : "Live order status"}
          </p>
          <p className="mt-1 text-lg font-bold leading-snug text-on-surface sm:text-xl">{label}</p>
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
      {visitComplete ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          Staff marked this visit complete. Your table QR session on this phone has ended —
          scan the code again when you return or when the next party is seated.
        </p>
      ) : !isTerminal ? (
        <p className="mt-3 text-xs text-on-surface-variant">
          Status updates automatically every few seconds.
        </p>
      ) : null}
    </section>
  );
}
