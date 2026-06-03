import type { OrderStatus, OrderType, PaymentStatus, PlacedOrder } from "@/lib/types";
import { getAllowedStatuses } from "@/lib/order-workflow";

export const PAYMENT_METHOD_LABELS: Record<PlacedOrder["paymentMethod"], string> = {
  gcash: "GCash (simulated)",
  cash: "Cash",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: "Dine-in",
  pickup: "Pick-up at counter",
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  paid: "Paid",
  preparing: "Preparing food",
  serving: "Serving",
  served: "Food served",
  ready_for_pickup: "Ready for pick-up",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Unpaid",
  paid: "Paid",
  failed: "Payment failed",
};

const LEGACY_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "pending_payment",
  confirmed: "paid",
  placed: "paid",
  completed: "served",
};

/** Maps legacy DB values from earlier iterations. */
export function normalizeOrderStatus(
  status: OrderStatus | string | undefined,
  orderType: OrderType = "dine_in",
): OrderStatus {
  if (!status) return "pending_payment";
  if (status in ORDER_STATUS_LABELS) return status as OrderStatus;
  const mapped = LEGACY_STATUS_MAP[status];
  if (mapped === "served" && orderType === "pickup") return "ready_for_pickup";
  return mapped ?? "pending_payment";
}

export function orderStatusLabel(
  status: OrderStatus | string | undefined,
  orderType: OrderType = "dine_in",
): string {
  return ORDER_STATUS_LABELS[normalizeOrderStatus(status, orderType)];
}

export function paymentStatusLabel(paymentStatus: PaymentStatus | undefined): string {
  if (!paymentStatus) return PAYMENT_STATUS_LABELS.pending;
  return PAYMENT_STATUS_LABELS[paymentStatus];
}

/** Customer-facing combined status for notifications and tracking. */
export function customerOrderStatusLabel(order: PlacedOrder): string {
  if (order.paymentStatus === "failed") {
    return "Payment failed — please retry";
  }

  const status = normalizeOrderStatus(order.status, order.customer.orderType);

  if (status === "served") return "Food served";
  if (status === "ready_for_pickup") return "Ready for pick-up";
  if (status === "serving") return "Serving your table";
  if (status === "preparing") return "Preparing food";
  if (status === "paid") return "Paid — waiting for kitchen";
  if (status === "pending_payment") {
    if (order.paymentMethod === "cash") {
      return order.customer.orderType === "pickup"
        ? "Pending payment — pay on pick-up"
        : "Pending payment — pay at table";
    }
    return "Pending payment";
  }

  return ORDER_STATUS_LABELS[status];
}

/** Kitchen workflow only — excludes payment queue states (use payment status instead). */
export function adminStatusOptions(order: PlacedOrder): OrderStatus[] {
  return getAllowedStatuses(order).filter(
    (s) => s !== "paid" && s !== "pending_payment",
  );
}

/** Admin order badge — never shows "Pending payment" (see payment badge). */
export function adminOrderStatusLabel(order: PlacedOrder): string {
  const status = normalizeOrderStatus(order.status, order.customer.orderType);
  if (status === "pending_payment" || status === "paid") {
    return "Awaiting kitchen";
  }
  return ORDER_STATUS_LABELS[status];
}
