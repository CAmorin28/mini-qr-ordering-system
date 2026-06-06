import type { OrderStatus, PaymentStatus } from "@/lib/types";

type BadgeKind = "order" | "payment";

const ORDER_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-amber-100 text-amber-900 ring-amber-200",
  paid: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  preparing: "bg-sky-100 text-sky-900 ring-sky-200",
  serving: "bg-violet-100 text-violet-900 ring-violet-200",
  served: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  ready_for_pickup: "bg-teal-100 text-teal-900 ring-teal-200",
  discontinued: "bg-error-container text-error ring-error/20",
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-900 ring-amber-200",
  paid: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  failed: "bg-error-container text-error ring-error/20",
};

interface AdminStatusBadgeProps {
  kind: BadgeKind;
  value: OrderStatus | PaymentStatus;
  label: string;
  className?: string;
}

export function AdminStatusBadge({ kind, value, label, className = "" }: AdminStatusBadgeProps) {
  const styles =
    kind === "order"
      ? ORDER_STYLES[value as OrderStatus]
      : PAYMENT_STYLES[value as PaymentStatus];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles} ${className}`.trim()}
    >
      {label}
    </span>
  );
}
