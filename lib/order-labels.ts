import type { OrderStatus, PaymentStatus, PlacedOrder } from "@/lib/types";

export const PAYMENT_METHOD_LABELS: Record<PlacedOrder["paymentMethod"], string> =
  {
    gcash: "GCash",
    cod: "Cash on Delivery (COD)",
  };

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Order pending payment",
  confirmed: "Order confirmed",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
};

/** Legacy orders saved before status split. */
export function orderStatusLabel(status: OrderStatus | "placed" | undefined): string {
  if (status === "placed" || status === "confirmed") {
    return "Order successfully placed";
  }
  if (status === "pending") {
    return ORDER_STATUS_LABELS.pending;
  }
  return ORDER_STATUS_LABELS.confirmed;
}

export function paymentStatusLabel(
  paymentStatus: PaymentStatus | undefined,
  orderStatus?: OrderStatus | "placed",
): string {
  if (paymentStatus) {
    return PAYMENT_STATUS_LABELS[paymentStatus];
  }
  if (orderStatus === "confirmed" || orderStatus === "placed") {
    return PAYMENT_STATUS_LABELS.paid;
  }
  return PAYMENT_STATUS_LABELS.pending;
}
