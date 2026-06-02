"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AdminDatabaseSetup } from "@/app/components/admin/AdminDatabaseSetup";
import { AdminStatusBadge } from "@/app/components/admin/AdminStatusBadge";
import {
  adminSignOut,
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
import { canStartPreparing, getNextStatus, syncStatuses } from "@/lib/order-workflow";
import { formatTableLabel } from "@/lib/table-session";
import type { OrderStatus, PaymentStatus, PlacedOrder } from "@/lib/types";

type FilterKey = "all" | "pending_payment" | "paid" | "failed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending_payment", label: "Pending payment" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
];

function matchesFilter(order: PlacedOrder, filter: FilterKey): boolean {
  if (filter === "all") return true;
  if (filter === "pending_payment") return order.paymentStatus === "pending";
  if (filter === "paid") return order.paymentStatus === "paid";
  return order.paymentStatus === "failed";
}

function OrderDetailPanel({
  order,
  onClose,
  onUpdated,
}: {
  order: PlacedOrder;
  onClose: () => void;
  onUpdated: (order: PlacedOrder) => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = status !== order.status || paymentStatus !== order.paymentStatus;

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

          <section className="mt-lg space-y-md rounded-xl border border-surface-variant bg-surface-container-low p-md">
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

        <div className="border-t border-surface-variant bg-surface-container-lowest p-md">
          {error && (
            <p className="mb-2 text-sm text-error" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="mb-2 text-sm font-semibold text-secondary">Changes saved.</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!dirty || saving}
            className="w-full rounded-xl bg-primary px-lg py-3 text-sm font-bold text-on-primary disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
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
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const filtered = useMemo(
    () => orders.filter((o) => matchesFilter(o, filter)),
    [orders, filter],
  );

  const stats = useMemo(() => {
    const pending = orders.filter((o) => o.paymentStatus === "pending").length;
    const paid = orders.filter((o) => o.paymentStatus === "paid").length;
    const failed = orders.filter((o) => o.paymentStatus === "failed").length;
    return { total: orders.length, pending, paid, failed };
  }, [orders]);

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
            { label: "Total orders", value: stats.total, icon: "receipt_long" },
            { label: "Pending payment", value: stats.pending, icon: "schedule" },
            { label: "Paid", value: stats.paid, icon: "paid" },
            { label: "Failed", value: stats.failed, icon: "error" },
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

        <div className="mt-lg flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                filter === f.key
                  ? "bg-primary text-on-primary shadow-sm"
                  : "border border-surface-variant bg-surface-container-lowest text-on-surface-variant hover:border-secondary-container hover:text-on-surface"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

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
        ) : databaseStatus === "connected" && filtered.length === 0 ? (
          <div className="mt-xl rounded-2xl border border-dashed border-surface-variant bg-surface-container-lowest p-xl text-center">
            <span className="material-symbols-outlined text-[48px] text-surface-variant">
              inbox
            </span>
            <p className="mt-md text-on-surface-variant">No orders in this view.</p>
          </div>
        ) : (
          <ul className="mt-lg space-y-md">
            {filtered.map((order) => (
              <li key={order.orderId}>
                <button
                  type="button"
                  onClick={() => setSelectedId(order.orderId)}
                  className="w-full rounded-2xl border border-surface-variant bg-surface-container-lowest p-md text-left shadow-sm transition-all hover:border-secondary-container/60 hover:shadow-md"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-on-surface">{order.orderNumber}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(order.createdAt).toLocaleString("en-PH")} ·{" "}
                        {order.customer.fullName}
                        {order.customer.tableLetter
                          ? ` · ${formatTableLabel(order.customer.tableLetter)}`
                          : ""}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-secondary">
                      {formatPrice(order.grandTotal)}
                    </p>
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
            ))}
          </ul>
        )}
      </main>

      {selected && (
        <OrderDetailPanel
          order={selected}
          onClose={() => setSelectedId(null)}
          onUpdated={(updated) => {
            handleOrderUpdated(updated);
            setSelectedId(updated.orderId);
          }}
        />
      )}
    </div>
  );
}
