"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrdersRealtime } from "@/app/hooks/useOrdersRealtime";
import { createPortal } from "react-dom";
import { AdminDatabaseSetup } from "@/app/components/admin/AdminDatabaseSetup";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
import { PageEnter } from "@/app/components/ui/PageEnter";
import { AdminStatusBadge } from "@/app/components/admin/AdminStatusBadge";
import {
  adminSignOut,
  completeAdminOrder,
  type DatabaseHealth,
  fetchAdminOrders,
  fetchAdminSession,
  fetchDatabaseHealth,
  updateAdminOrder,
} from "@/lib/api-admin";
import { formatPrice } from "@/lib/format";
import { mergeOrderIntoList } from "@/lib/supabase/orders-realtime";
import { ADMIN_LOGIN_PATH, staffQrPath } from "@/lib/menu-url";
import {
  adminOrderStatusLabel,
  adminStatusOptions,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/order-labels";
import {
  activeOrderCount,
  buildAdminBoardSections,
  countByOrderType,
  hasVisibleBoardOrders,
  inProgressCount,
  paymentFailedCount,
  type AdminBoardSection,
} from "@/lib/admin-order-board";
import {
  canMarkOrderDone,
  dailyCompletedSummary,
  filterAwaitingCompletionOrders,
  filterCompletedOrders,
  hasReadyHandoff,
  isCompletedOrder,
  todayDateKey,
} from "@/lib/order-completion";
import { getNextStatus, syncStatuses } from "@/lib/order-workflow";
import { formatTableLabel } from "@/lib/table-session";
import type { OrderStatus, OrderType, PaymentStatus, PlacedOrder } from "@/lib/types";

type AdminView = "active" | "paid" | "archive";

const ADMIN_VIEW_TABS: {
  key: AdminView;
  label: string;
  shortLabel: string;
  icon: string;
}[] = [
  { key: "active", label: "Active orders", shortLabel: "Active", icon: "pending_actions" },
  { key: "paid", label: "Ready to complete", shortLabel: "Ready", icon: "task_alt" },
  { key: "archive", label: "All orders", shortLabel: "All", icon: "inventory_2" },
];

const ORDER_TYPE_TABS: { key: OrderType; label: string; icon: string }[] = [
  { key: "dine_in", label: "Dine-in", icon: "restaurant" },
  { key: "pickup", label: "Pick-up", icon: "takeout_dining" },
];

function OrderListCard({
  order,
  onSelect,
}: {
  order: PlacedOrder;
  onSelect: (orderId: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(order.orderId)}
        className="w-full touch-manipulation rounded-2xl border border-surface-variant bg-surface-container-lowest p-md text-left shadow-sm transition-all hover:border-secondary-container/60 hover:shadow-md active:scale-[0.99]"
      >
        <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-bold text-on-surface">{order.orderNumber}</p>
            <p className="break-words text-xs text-on-surface-variant">
              {new Date(order.createdAt).toLocaleString("en-PH")} · {order.customer.fullName}
              {order.customer.tableLetter
                ? ` · ${formatTableLabel(order.customer.tableLetter)}`
                : ""}
            </p>
          </div>
          <p className="shrink-0 text-base font-bold tabular-nums text-secondary sm:text-lg">
            {formatPrice(order.grandTotal)}
          </p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AdminStatusBadge
            kind="order"
            value={order.status}
            label={adminOrderStatusLabel(order)}
          />
          <AdminStatusBadge
            kind="payment"
            value={order.paymentStatus}
            label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
          />
          <span className="text-xs text-on-surface-variant">
            {order.lines.length} item{order.lines.length === 1 ? "" : "s"} ·{" "}
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
          </span>
        </div>
      </button>
    </li>
  );
}

function ReadyToCompleteQueue({
  orders,
  onSelectOrder,
}: {
  orders: PlacedOrder[];
  onSelectOrder: (orderId: string) => void;
}) {
  const queue = useMemo(() => filterAwaitingCompletionOrders(orders), [orders]);

  return (
    <div className="mt-lg space-y-lg">
      {queue.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-surface-variant">
            task_alt
          </span>
          <p className="mt-md text-on-surface-variant">
            Nothing here yet. On Active orders, tap Done when payment is confirmed and food is
            served or ready for pick-up — then complete the visit here.
          </p>
        </div>
      ) : (
        <section className="rounded-2xl border border-emerald-200/70 bg-emerald-50/30 p-md">
          <h2 className="text-base font-bold text-on-surface">
            Ready to complete
            <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
              {queue.length}
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Handed off from Active — tap Complete order to archive under All orders.
          </p>
          <ul className="mt-md space-y-sm">
            {queue.map((order) => (
              <OrderListCard key={order.orderId} order={order} onSelect={onSelectOrder} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function CompletedOrdersArchive({
  orders,
  selectedDay,
  onDayChange,
  onSelectOrder,
}: {
  orders: PlacedOrder[];
  selectedDay: string;
  onDayChange: (day: string) => void;
  onSelectOrder: (orderId: string) => void;
}) {
  const summary = useMemo(
    () => dailyCompletedSummary(orders, selectedDay),
    [orders, selectedDay],
  );

  return (
    <div className="mt-lg space-y-lg">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label
            htmlFor="archive-day"
            className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant"
          >
            Day (Philippines time)
          </label>
          <input
            id="archive-day"
            type="date"
            value={selectedDay}
            max={todayDateKey()}
            onChange={(e) => onDayChange(e.target.value)}
            className="checkout-input mt-1 block w-full max-w-full min-w-0"
          />
        </div>
        <button
          type="button"
          onClick={() => onDayChange(todayDateKey())}
          className="min-h-11 w-full touch-manipulation rounded-xl border border-surface-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-secondary-container sm:w-auto"
        >
          Today
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Completed orders
          </p>
          <p className="admin-stat-value mt-2 font-bold text-on-surface">{summary.count}</p>
        </div>
        <div className="rounded-2xl border border-secondary-container/40 bg-secondary-container/10 p-md shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Total sales (paid & completed)
          </p>
          <p className="admin-stat-value mt-2 font-bold text-secondary">
            {formatPrice(summary.totalAmount)}
          </p>
        </div>
      </div>

      <p className="text-xs text-on-surface-variant">
        Count and total include only completed orders with payment marked as paid.
      </p>

      {summary.orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
          <span className="material-symbols-outlined text-[48px] text-surface-variant">
            event_busy
          </span>
          <p className="mt-md text-on-surface-variant">No completed orders for this day.</p>
        </div>
      ) : (
        <section className="rounded-2xl border border-surface-variant bg-surface-container-low/60 p-md">
          <h2 className="text-base font-bold text-on-surface">
            Completed on{" "}
            {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-PH", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          <ul className="mt-md space-y-sm">
            {summary.orders.map((order) => (
              <OrderListCard key={order.orderId} order={order} onSelect={onSelectOrder} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function OrderBoardSection({
  section,
  onSelectOrder,
}: {
  section: AdminBoardSection;
  onSelectOrder: (orderId: string) => void;
}) {
  return (
    <section
      className={`rounded-2xl border p-md ${section.accentClass}`}
      aria-labelledby={`admin-section-${section.id}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className="material-symbols-outlined mt-0.5 text-[26px] text-secondary-container"
            aria-hidden
          >
            {section.icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id={`admin-section-${section.id}`}
              className="text-base font-bold leading-snug text-on-surface"
            >
              {section.title}
              <span className="ml-2 inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold text-primary">
                {section.orders.length}
              </span>
            </h2>
            <p className="mt-0.5 text-xs text-on-surface-variant">{section.subtitle}</p>
          </div>
        </div>
      </div>

      <ul className="mt-md space-y-sm">
        {section.orders.map((order) => (
          <OrderListCard key={order.orderId} order={order} onSelect={onSelectOrder} />
        ))}
      </ul>
    </section>
  );
}

function OrderDetailPanel({
  order,
  onClose,
  onUpdated,
  onReadyHandoff,
  onCompleted,
}: {
  order: PlacedOrder;
  onClose: () => void;
  onUpdated: (order: PlacedOrder) => void;
  onReadyHandoff?: () => void;
  onCompleted?: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  useEffect(() => {
    setStatus(order.status);
    setPaymentStatus(order.paymentStatus);
  }, [order.orderId, order.status, order.paymentStatus]);
  const [saving, setSaving] = useState(false);
  const [markingDone, setMarkingDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const archived = isCompletedOrder(order);
  const readyHandoff = hasReadyHandoff(order);
  const preview = { ...order, status, paymentStatus };
  const showDone = !archived && canMarkOrderDone(preview);
  const showComplete = !archived && readyHandoff;
  const preKitchen = status === "pending_payment" || status === "paid";
  const dirty =
    !archived && (status !== order.status || paymentStatus !== order.paymentStatus);

  async function handleMarkDone() {
    if (archived || !canMarkOrderDone(preview)) return;
    setMarkingDone(true);
    setError(null);
    try {
      const synced = syncStatuses(status, paymentStatus);
      const updated = await updateAdminOrder(order.orderId, {
        status: synced.status,
        paymentStatus: synced.paymentStatus,
        ready: true,
      });
      onUpdated(updated);
      onReadyHandoff?.();
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to mark order done");
    } finally {
      setMarkingDone(false);
    }
  }

  async function handleComplete() {
    if (archived || !readyHandoff) return;
    setCompleting(true);
    setError(null);
    try {
      const updated = await completeAdminOrder(order.orderId);
      onUpdated(updated);
      onCompleted?.();
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to complete order");
    } finally {
      setCompleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const synced = syncStatuses(status, paymentStatus);
      const updated = await updateAdminOrder(order.orderId, synced);
      onUpdated(updated);
      setStatus(updated.status);
      setPaymentStatus(updated.paymentStatus);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (isCompletedOrder(updated)) {
        onCompleted?.();
      }
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        window.location.reload();
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="admin-order-modal-backdrop fixed inset-0 z-[60] flex justify-center bg-primary/40 backdrop-blur-sm">
      <div
        className="admin-order-modal-panel flex flex-col overflow-hidden border border-surface-variant bg-surface-container-lowest shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-variant px-md py-md">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Order details
            </p>
            <h2 id="admin-order-title" className="text-lg font-bold text-on-surface">
              {order.orderNumber}
            </h2>
            <p className="text-xs text-on-surface-variant">
              {new Date(order.createdAt).toLocaleString("en-PH")}
              {order.completedAt
                ? ` · Completed ${new Date(order.completedAt).toLocaleString("en-PH")}`
                : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="touch-target flex items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="cart-scroll flex-1 overflow-y-auto px-md py-md">
          <div className="flex flex-wrap gap-2">
            <AdminStatusBadge
              kind="order"
              value={order.status}
              label={adminOrderStatusLabel(order)}
            />
            <AdminStatusBadge
              kind="payment"
              value={order.paymentStatus}
              label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
            />
          </div>

          <p className="admin-stat-value mt-md font-bold text-secondary">
            {formatPrice(order.grandTotal)}
          </p>
          <p className="text-sm text-on-surface-variant">
            {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            {order.cutlery ? " · Cutlery requested" : ""}
          </p>

          <section className="mt-lg">
            <h3 className="text-sm font-bold text-on-surface">Customer</h3>
            <p className="mt-1 text-sm text-on-surface">{order.customer.fullName}</p>
            <p className="text-sm text-on-surface-variant">
              {ORDER_TYPE_LABELS[order.customer.orderType]}
              {order.customer.tableLetter
                ? ` · ${formatTableLabel(order.customer.tableLetter)}`
                : ""}
            </p>
            {order.customer.contactNumber ? (
              <p className="text-sm text-on-surface-variant">{order.customer.contactNumber}</p>
            ) : null}
            {order.customer.notes ? (
              <p className="mt-2 rounded-lg bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
                {order.customer.notes}
              </p>
            ) : null}
          </section>

          <section className="mt-lg">
            <h3 className="text-sm font-bold text-on-surface">Items</h3>
            <ul className="mt-2 space-y-2">
              {order.lines.map((line) => (
                <li
                  key={line.item.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-on-surface">
                    <span className="mr-1">{line.item.emoji ?? "🍽️"}</span>
                    {line.quantity}× {line.item.name}
                  </span>
                  <span className="shrink-0 font-semibold text-on-surface-variant">
                    {formatPrice(line.item.price * line.quantity)}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {archived ? (
            <p className="mt-lg rounded-xl border border-secondary-container/40 bg-secondary-container/15 px-md py-3 text-sm font-semibold text-on-secondary-container">
              This order is completed and archived. It appears under All orders for daily
              totals.
            </p>
          ) : null}

          <section
            className={`mt-lg space-y-md rounded-xl border border-surface-variant bg-surface-container-low p-md ${archived ? "pointer-events-none opacity-50" : ""}`}
          >
            <h3 className="text-sm font-bold text-on-surface">Update status</h3>

            <div>
              <label htmlFor="order-status" className="text-xs font-semibold text-on-surface-variant">
                Kitchen status
              </label>
              {preKitchen ? (
                <p className="mt-1 rounded-lg border border-surface-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
                  {adminOrderStatusLabel({ ...order, status, paymentStatus })} — use{" "}
                  <span className="font-semibold text-on-surface">Payment status</span> below, then
                  Advance or Mark as paid before starting preparation.
                </p>
              ) : (
                <select
                  id="order-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as OrderStatus)}
                  className="checkout-input mt-1 w-full"
                >
                  {(adminStatusOptions(order) as OrderStatus[]).map((key) => (
                    <option key={key} value={key}>
                      {ORDER_STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label
                htmlFor="payment-status"
                className="text-xs font-semibold text-on-surface-variant"
              >
                Payment status
              </label>
              <select
                id="payment-status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="checkout-input mt-1 w-full"
              >
                {(Object.keys(PAYMENT_STATUS_LABELS) as PaymentStatus[]).map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-quick-actions">
              {order.paymentStatus !== "paid" && (
                <button
                  type="button"
                  onClick={() => setPaymentStatus("paid")}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 sm:py-1.5"
                >
                  Mark as paid
                </button>
              )}
              {getNextStatus(order) && (
                <button
                  type="button"
                  onClick={() => {
                    const next = getNextStatus({ ...order, status, paymentStatus });
                    if (!next) return;
                    setStatus(next);
                  }}
                  className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2 text-left text-xs font-semibold text-sky-900 hover:bg-sky-100 sm:py-1.5"
                >
                  Advance to {ORDER_STATUS_LABELS[getNextStatus({ ...order, status, paymentStatus })!]}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentStatus("failed")}
                className="rounded-lg border border-error/30 bg-error-container/40 px-3 py-2 text-xs font-semibold text-error hover:opacity-90 sm:py-1.5"
              >
                Mark payment failed
              </button>
            </div>
          </section>
        </div>

        <div className="admin-modal-footer border-t border-surface-variant bg-surface-container-lowest p-md pb-[calc(var(--spacing-md)+env(safe-area-inset-bottom,0px))] space-y-2 sm:pb-md">
          {error && (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-sm font-semibold text-secondary">Changes saved.</p>
          )}
          {!archived ? (
            <>
              {showDone ? (
                <button
                  type="button"
                  onClick={handleMarkDone}
                  disabled={markingDone || saving || completing}
                  className="w-full rounded-xl bg-secondary px-lg py-3 text-sm font-bold text-on-primary disabled:opacity-40"
                >
                  {markingDone ? "Moving…" : "Done"}
                </button>
              ) : null}
              {showComplete ? (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={completing || saving || markingDone}
                  className="w-full rounded-xl bg-secondary px-lg py-3 text-sm font-bold text-on-primary disabled:opacity-40"
                >
                  {completing ? "Completing…" : "Complete order"}
                </button>
              ) : null}
              {showDone ? (
                <p className="text-xs text-on-surface-variant">
                  Payment confirmed and kitchen finished — tap Done to move this order to Ready to
                  complete.
                </p>
              ) : null}
              {showComplete ? (
                <p className="text-xs text-on-surface-variant">
                  Visit handed off — tap Complete order to archive under All orders.
                </p>
              ) : null}
              {!showDone && !showComplete ? (
                <p className="text-xs text-on-surface-variant">
                  Update payment and kitchen status above. When food is served or ready for pick-up
                  with payment confirmed, Done appears here.
                </p>
              ) : null}
            </>
          ) : null}
          {!archived ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving || completing || markingDone}
              className="w-full rounded-xl border border-surface-variant bg-surface-container-lowest px-lg py-3 text-sm font-bold text-on-surface disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save status changes"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl bg-primary px-lg py-3 text-sm font-bold text-on-primary"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function AdminApp() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [booting, setBooting] = useState(true);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [databaseStatus, setDatabaseStatus] = useState<DatabaseHealth | null>(null);
  const [adminView, setAdminView] = useState<AdminView>("active");
  const [orderTypeTab, setOrderTypeTab] = useState<OrderType>("dine_in");
  const [archiveDay, setArchiveDay] = useState(todayDateKey);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    setOrdersError(null);
    try {
      const health = await fetchDatabaseHealth();
      setDatabaseStatus(health.database);

      if (health.database !== "connected") {
        setOrders([]);
        setOrdersError(
          health.database === "not_configured"
            ? "Database not configured"
            : (health.message ?? "Database connection failed"),
        );
        return;
      }

      const list = await fetchAdminOrders();
      setOrders(list);
      setOrdersError(null);
    } catch (err) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        router.replace(ADMIN_LOGIN_PATH);
        return;
      }
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code?: string }).code)
          : undefined;
      if (code === "DATABASE_NOT_CONFIGURED") {
        setDatabaseStatus("not_configured");
      }
      setOrdersError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAdminSession()
      .then((session) => {
        if (!session.authenticated) {
          router.replace(ADMIN_LOGIN_PATH);
          return;
        }
        setAuthenticated(true);
      })
      .catch(() => {
        router.replace(ADMIN_LOGIN_PATH);
      })
      .finally(() => setBooting(false));
  }, [router]);

  useEffect(() => {
    if (authenticated) {
      loadOrders();
    }
  }, [authenticated, loadOrders]);

  useOrdersRealtime(
    { mode: "all" },
    {
      onUpsert: (order) => {
        setOrders((prev) => mergeOrderIntoList(prev, order));
      },
      onDelete: (orderId) => {
        setOrders((prev) => prev.filter((o) => o.orderId !== orderId));
      },
    },
    {
      enabled: authenticated && databaseStatus === "connected",
      fallbackPoll: loadOrders,
    },
  );

  const typeCounts = useMemo(() => countByOrderType(orders), [orders]);

  const boardSections = useMemo(
    () => buildAdminBoardSections(orders, orderTypeTab),
    [orders, orderTypeTab],
  );

  const todaySummary = useMemo(
    () => dailyCompletedSummary(orders, todayDateKey()),
    [orders],
  );

  const stats = useMemo(
    () => ({
      active: activeOrderCount(orders),
      dineInActive: inProgressCount(orders, "dine_in"),
      pickupActive: inProgressCount(orders, "pickup"),
      todaySales: todaySummary.totalAmount,
    }),
    [orders, todaySummary.totalAmount],
  );

  const paidQueueCount = useMemo(
    () => filterAwaitingCompletionOrders(orders).length,
    [orders],
  );
  const archivedCount = useMemo(() => filterCompletedOrders(orders).length, [orders]);

  const boardHasOrders = hasVisibleBoardOrders(orders, orderTypeTab);

  const selected = orders.find((o) => o.orderId === selectedId) ?? null;

  async function handleSignOut() {
    await adminSignOut();
    setOrders([]);
    setSelectedId(null);
    router.replace(ADMIN_LOGIN_PATH);
  }

  function handleOrderUpdated(updated: PlacedOrder) {
    setOrders((prev) => prev.map((o) => (o.orderId === updated.orderId ? updated : o)));
  }

  if (booting) {
    return (
      <div className="admin-shell min-h-dvh w-full bg-background">
        <LoadingBlock fullPage message="Loading admin…" />
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <PageEnter className="admin-shell flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-primary-container/20 bg-primary pt-[env(safe-area-inset-top,0px)] shadow-md">
        <div className="mx-auto flex max-w-6xl min-w-0 items-center justify-between gap-2 px-margin-mobile py-3 sm:gap-3 sm:py-4 md:px-margin-desktop">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="material-symbols-outlined shrink-0 text-[26px] text-secondary-container sm:text-[28px]">
              admin_panel_settings
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-primary/60">
                TableBite
              </p>
              <h1 className="truncate text-base font-bold text-on-primary sm:text-lg">
                Admin dashboard
              </h1>
            </div>
          </div>
          <div className="admin-header-toolbar flex shrink-0 items-center gap-1 sm:gap-2">
            <Link
              href={staffQrPath()}
              className="admin-header-btn rounded-xl border border-on-primary/25 text-sm font-semibold text-on-primary hover:bg-on-primary/10"
              aria-label="Table QR codes"
            >
              <span className="material-symbols-outlined text-[22px]">qr_code_2</span>
              <span className="hidden sm:ml-1 sm:inline">Table QR</span>
            </Link>
            <button
              type="button"
              onClick={() => loadOrders()}
              disabled={loadingOrders}
              aria-label="Refresh orders"
              className="admin-header-btn rounded-xl border border-on-primary/25 text-sm font-semibold text-on-primary hover:bg-on-primary/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[22px]">refresh</span>
              <span className="hidden sm:ml-1 sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="admin-header-btn rounded-xl bg-on-primary/10 text-sm font-semibold text-on-primary hover:bg-secondary-container hover:text-on-secondary-container"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page-main mx-auto w-full min-w-0 max-w-6xl flex-1 px-margin-mobile pt-lg md:px-margin-desktop">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Active orders", value: stats.active, icon: "pending_actions" },
            { label: "Dine-in active", value: stats.dineInActive, icon: "restaurant" },
            { label: "Pick-up active", value: stats.pickupActive, icon: "takeout_dining" },
            {
              label: "Today's sales",
              value: formatPrice(stats.todaySales),
              icon: "payments",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                  {stat.label}
                </p>
                <span className="material-symbols-outlined text-[22px] text-secondary-container">
                  {stat.icon}
                </span>
              </div>
              <p className="admin-stat-value mt-2 font-bold text-on-surface">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-lg">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            View
          </p>
          <div className="mt-2 grid w-full max-w-full grid-cols-3 gap-2 sm:max-w-[48rem]">
            {ADMIN_VIEW_TABS.map((tab) => {
              const count =
                tab.key === "active"
                  ? stats.active
                  : tab.key === "paid"
                    ? paidQueueCount
                    : archivedCount;
              const active = adminView === tab.key;
              const queueNeedsAttention = tab.key === "paid" && paidQueueCount > 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setAdminView(tab.key)}
                  className={`admin-view-tab flex min-h-[3.25rem] min-w-0 touch-manipulation flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-2.5 text-[10px] font-semibold leading-tight transition-colors sm:min-h-12 sm:flex-row sm:gap-2 sm:px-3 sm:py-3 sm:text-sm ${
                    active
                      ? "bg-primary text-on-primary shadow-sm"
                      : queueNeedsAttention
                        ? "border-2 border-amber-400 bg-amber-50 text-amber-950 shadow-sm ring-2 ring-amber-200/80 hover:border-amber-500"
                        : "border border-surface-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{tab.icon}</span>
                  <span className="admin-view-tab__label sm:hidden">{tab.shortLabel}</span>
                  <span className="admin-view-tab__label hidden sm:inline">{tab.label}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      active
                        ? "bg-on-primary/20 text-on-primary"
                        : queueNeedsAttention
                          ? "bg-amber-600 text-white"
                          : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {adminView === "active" ? (
          <div className="mt-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
              Order type
            </p>
            <div className="mt-2 grid w-full max-w-full grid-cols-2 gap-2 sm:max-w-[28rem]">
              {ORDER_TYPE_TABS.map((tab) => {
                const count = typeCounts[tab.key];
                const active = orderTypeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setOrderTypeTab(tab.key)}
                    className={`flex min-h-11 min-w-0 touch-manipulation items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors sm:min-h-12 sm:px-4 ${
                      active
                        ? "bg-primary text-on-primary shadow-sm"
                        : "border border-surface-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary-container hover:text-on-surface"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                    {tab.label}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                        active
                          ? "bg-on-primary/20 text-on-primary"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : adminView === "paid" ? (
          <p className="mt-lg text-sm text-on-surface-variant">
            Orders at served or ready for pick-up with payment confirmed appear here. Mark each
            complete when the visit is finished — they then move to All orders for daily totals.
          </p>
        ) : (
          <p className="mt-lg text-sm text-on-surface-variant">
            Completed orders are grouped by day. Daily totals count paid completed orders only.
          </p>
        )}

        {completionNotice ? (
          <p
            className="mt-md rounded-xl border border-secondary-container/50 bg-secondary-container/20 px-md py-3 text-sm font-semibold text-on-secondary-container"
            role="status"
          >
            {completionNotice}
          </p>
        ) : null}

        {ordersError && databaseStatus !== "connected" ? (
          <AdminDatabaseSetup
            databaseStatus={databaseStatus ?? "not_configured"}
            message={ordersError}
          />
        ) : ordersError ? (
          <p className="mt-md rounded-xl bg-error-container/50 px-md py-3 text-sm text-error">
            {ordersError}
          </p>
        ) : null}

        {loadingOrders && orders.length === 0 && databaseStatus === "connected" ? (
          <LoadingBlock className="mt-xl py-xl" message="Loading orders…" />
        ) : adminView === "paid" && databaseStatus === "connected" ? (
          <ReadyToCompleteQueue orders={orders} onSelectOrder={setSelectedId} />
        ) : adminView === "archive" && databaseStatus === "connected" ? (
          <CompletedOrdersArchive
            orders={orders}
            selectedDay={archiveDay}
            onDayChange={setArchiveDay}
            onSelectOrder={setSelectedId}
          />
        ) : adminView === "active" && databaseStatus === "connected" && !boardHasOrders ? (
          <div className="mt-xl rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-surface-variant">
              inbox
            </span>
            <p className="mt-md text-on-surface-variant">
              No active {orderTypeTab === "dine_in" ? "dine-in" : "pick-up"} orders.
            </p>
          </div>
        ) : adminView === "active" && databaseStatus === "connected" ? (
          <div className="mt-lg space-y-lg">
            {boardSections.map((section) => (
              <OrderBoardSection
                key={section.id}
                section={section}
                onSelectOrder={setSelectedId}
              />
            ))}
          </div>
        ) : null}
      </main>

      {selected && (
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={(updated) => {
            handleOrderUpdated(updated);
            setSelectedId(updated.orderId);
          }}
          onReadyHandoff={() => {
            setSelectedId(null);
            setAdminView("paid");
            setCompletionNotice(
              "Moved to Ready to complete. Open an order there and tap Complete order when finished.",
            );
            window.setTimeout(() => setCompletionNotice(null), 5000);
          }}
          onCompleted={() => {
            setSelectedId(null);
            setAdminView("archive");
            setCompletionNotice("Order archived under All orders.");
            window.setTimeout(() => setCompletionNotice(null), 4000);
          }}
        />
      )}
    </PageEnter>
  );
}
