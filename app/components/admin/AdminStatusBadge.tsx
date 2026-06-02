import type { OrderStatus, PaymentStatus } from "@/lib/types";

type BadgeKind = "order" | "payment";

const ORDER_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900 ring-amber-200",
  confirmed: "bg-emerald-100 text-emerald-900 ring-emerald-200",
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
}

export function AdminStatusBadge({ kind, value, label }: AdminStatusBadgeProps) {
  const styles =
    kind === "order"
      ? ORDER_STYLES[value as OrderStatus]
      : PAYMENT_STYLES[value as PaymentStatus];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      {label}
    </span>
  );
}
