"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AdminDatabaseSetup } from "@/app/components/admin/AdminDatabaseSetup";
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
import { ADMIN_LOGIN_PATH, staffQrPath } from "@/lib/menu-url";
import {
  adminStatusOptions,
  customerOrderStatusLabel,
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
  canArchiveOrder,
  dailyCompletedSummary,
  filterAwaitingCompletionOrders,
  filterCompletedOrders,
  isAwaitingManualCompletion,
  isCompletedOrder,
  todayDateKey,
} from "@/lib/order-completion";
import { canStartPreparing, getNextStatus, syncStatuses } from "@/lib/order-workflow";
import { formatTableLabel } from "@/lib/table-session";
import type { OrderStatus, OrderType, PaymentStatus, PlacedOrder } from "@/lib/types";

type AdminView = "active" | "paid" | "archive";

const ADMIN_VIEW_TABS: { key: AdminView; label: string; icon: string }[] = [
  { key: "active", label: "Active orders", icon: "pending_actions" },
  { key: "paid", label: "Ready to complete", icon: "task_alt" },
  { key: "archive", label: "All orders", icon: "inventory_2" },
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
        className="w-full rounded-2xl border border-surface-variant bg-surface-container-lowest p-md text-left shadow-sm transition-all hover:border-secondary-container/60 hover:shadow-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold text-on-surface">{order.orderNumber}</p>
            <p className="text-xs text-on-surface-variant">
              {new Date(order.createdAt).toLocaleString("en-PH")} · {order.customer.fullName}
              {order.customer.tableLetter
                ? ` · ${formatTableLabel(order.customer.tableLetter)}`
                : ""}
            </p>
          </div>
          <p className="text-lg font-bold text-secondary">{formatPrice(order.grandTotal)}</p>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <AdminStatusBadge
            kind="order"
            value={order.status}
            label={customerOrderStatusLabel(order)}
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
            Nothing ready to complete. When an order is served or ready for pick-up with payment
            confirmed, it appears here until you mark it complete.
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
            Served or ready for pick-up with payment confirmed — review, then complete to archive
            under All orders.
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
            className="checkout-input mt-1 block"
          />
        </div>
        <button
          type="button"
          onClick={() => onDayChange(todayDateKey())}
          className="rounded-xl border border-surface-variant bg-surface-container-lowest px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-secondary-container"
        >
          Today
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Completed orders
          </p>
          <p className="mt-2 text-3xl font-bold text-on-surface">{summary.count}</p>
        </div>
        <div className="rounded-2xl border border-secondary-container/40 bg-secondary-container/10 p-md shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Total sales (paid & completed)
          </p>
          <p className="mt-2 text-3xl font-bold text-secondary">
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
          <div>
            <h2
              id={`admin-section-${section.id}`}
              className="text-base font-bold text-on-surface"
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
  onCompleted,
}: {
  order: PlacedOrder;
  onClose: () => void;
  onUpdated: (order: PlacedOrder) => void;
  onCompleted?: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const archived = isCompletedOrder(order);
  const paid = paymentStatus === "paid";
  const dirty =
    !archived && (status !== order.status || paymentStatus !== order.paymentStatus);

  async function handleComplete() {
    if (archived) return;
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
      if (
        synced.status === "preparing" &&
        order.customer.orderType === "dine_in" &&
        !canStartPreparing({ ...order, ...synced })
      ) {
        setError("Dine-in orders must be paid before preparation begins.");
        setSaving(false);
        return;
      }
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
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-primary/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex max-h-[92dvh] w-full max-w-[min(100%,32rem)] flex-col overflow-hidden rounded-t-2xl border border-surface-variant bg-surface-container-lowest shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-order-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-surface-variant px-md py-md">
          <div>
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
            className="flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant hover:bg-surface-container"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="cart-scroll flex-1 overflow-y-auto px-md py-md">
          <div className="flex flex-wrap gap-2">
            <AdminStatusBadge
              kind="order"
              value={order.status}
              label={customerOrderStatusLabel(order)}
            />
            <AdminStatusBadge
              kind="payment"
              value={order.paymentStatus}
              label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
            />
          </div>

          <p className="mt-md text-2xl font-bold text-secondary">{formatPrice(order.grandTotal)}</p>
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
                Order status
              </label>
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

            <div className="flex flex-wrap gap-2">
              {order.paymentStatus !== "paid" && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentStatus("paid");
                    setStatus("paid");
                  }}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
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
                    if (
                      next === "preparing" &&
                      order.customer.orderType === "dine_in" &&
                      paymentStatus !== "paid" &&
                      status !== "paid"
                    ) {
                      setError("Mark payment as paid before starting preparation.");
                      return;
                    }
                    setStatus(next);
                    if (next !== "pending_payment") {
                      setPaymentStatus("paid");
                    }
                  }}
                  className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 hover:bg-sky-100"
                >
                  Advance to {ORDER_STATUS_LABELS[getNextStatus({ ...order, status, paymentStatus })!]}
                </button>
              )}
              <button
                type="button"
                onClick={() => setPaymentStatus("failed")}
                className="rounded-lg border border-error/30 bg-error-container/40 px-3 py-1.5 text-xs font-semibold text-error hover:opacity-90"
              >
                Mark payment failed
              </button>
            </div>
          </section>
        </div>

        <div className="border-t border-surface-variant bg-surface-container-lowest p-md space-y-2">
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
              <button
                type="button"
                onClick={handleComplete}
                disabled={completing || saving || !canArchiveOrder({ ...order, paymentStatus })}
                className="w-full rounded-xl bg-secondary px-lg py-3 text-sm font-bold text-on-primary disabled:opacity-40"
              >
                {completing ? "Completing…" : "Complete order"}
              </button>
              {!paid ? (
                <p className="text-xs text-on-surface-variant">
                  Mark payment as paid before completing.
                </p>
              ) : isAwaitingManualCompletion(order) ? (
                <p className="text-xs text-on-surface-variant">
                  This order is ready to complete. Confirm the visit is finished, then tap Complete
                  order.
                </p>
              ) : (
                <p className="text-xs text-on-surface-variant">
                  When saved as served or ready for pick-up with paid payment, the order moves to
                  Ready to complete for you to archive manually.
                </p>
              )}
            </>
          ) : null}
          {!archived ? (
            <button
              type="button"
              onClick={handleSave}
              disabled={!dirty || saving || completing}
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
      <div className="flex min-h-dvh w-full flex-1 items-center justify-center bg-background text-on-surface-variant">
        <div className="payment-spinner" aria-hidden />
        <span className="sr-only">Loading admin…</span>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  return (
    <div className="flex min-h-dvh w-full min-w-0 flex-1 flex-col bg-background">
      <header className="sticky top-0 z-50 border-b border-primary-container/20 bg-primary shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-margin-mobile py-4 md:px-margin-desktop">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[28px] text-secondary-container">
              admin_panel_settings
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-primary/60">
                TableBite
              </p>
              <h1 className="text-lg font-bold text-on-primary">Admin dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={staffQrPath()}
              className="flex min-h-10 items-center gap-1 rounded-xl border border-on-primary/25 px-3 py-2 text-sm font-semibold text-on-primary hover:bg-on-primary/10"
            >
              <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
              <span className="hidden sm:inline">Table QR</span>
            </Link>
            <button
              type="button"
              onClick={() => loadOrders()}
              disabled={loadingOrders}
              className="flex min-h-10 items-center gap-1 rounded-xl border border-on-primary/25 px-3 py-2 text-sm font-semibold text-on-primary hover:bg-on-primary/10 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">refresh</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex min-h-10 items-center gap-1 rounded-xl bg-on-primary/10 px-3 py-2 text-sm font-semibold text-on-primary hover:bg-secondary-container hover:text-on-secondary-container"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-margin-mobile pb-xl pt-lg md:px-margin-desktop">
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
              <p className="mt-2 text-3xl font-bold text-on-surface">{stat.value}</p>
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
                  className={`flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-3 text-xs font-semibold leading-tight transition-colors sm:flex-row sm:gap-2 sm:px-3 sm:text-sm ${
                    active
                      ? "bg-primary text-on-primary shadow-sm"
                      : queueNeedsAttention
                        ? "border-2 border-amber-400 bg-amber-50 text-amber-950 shadow-sm ring-2 ring-amber-200/80 hover:border-amber-500"
                        : "border border-surface-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary-container hover:text-on-surface"
                  }`}
                >
                  <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                  <span className="text-center sm:text-left">{tab.label}</span>
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
                    className={`flex min-h-12 min-w-0 items-center justify-center gap-2 rounded-2xl px-3 py-3 text-sm font-semibold transition-colors sm:px-4 ${
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
          <p className="mt-xl text-on-surface-variant">Loading orders…</p>
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
          onCompleted={() => {
            setSelectedId(null);
            setAdminView("paid");
            setCompletionNotice("Order archived. Complete the rest here, or open All orders for daily totals.");
            window.setTimeout(() => setCompletionNotice(null), 4000);
          }}
        />
      )}
    </div>
  );
}
