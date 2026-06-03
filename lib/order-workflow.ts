import type { OrderStatus, OrderType, PlacedOrder } from "@/lib/types";

export const DINE_IN_STATUS_FLOW: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "serving",
  "served",
];

export const PICKUP_STATUS_FLOW: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "ready_for_pickup",
];

export function statusFlowForOrderType(orderType: OrderType): OrderStatus[] {
  return orderType === "pickup" ? PICKUP_STATUS_FLOW : DINE_IN_STATUS_FLOW;
}

export function getAllowedStatuses(order: PlacedOrder): OrderStatus[] {
  return statusFlowForOrderType(order.customer.orderType);
}

function kitchenStatusFlow(orderType: OrderType): OrderStatus[] {
  return statusFlowForOrderType(orderType).filter((s) => s !== "paid");
}

function statusForKitchenFlow(status: OrderStatus): OrderStatus {
  return status === "paid" ? "pending_payment" : status;
}

export function getNextStatus(order: PlacedOrder): OrderStatus | null {
  const flow = kitchenStatusFlow(order.customer.orderType);
  const index = flow.indexOf(statusForKitchenFlow(order.status));
  if (index < 0 || index >= flow.length - 1) return null;
  return flow[index + 1] ?? null;
}

/** Dine-in kitchen steps require payment first. */
export function canStartPreparing(order: PlacedOrder): boolean {
  if (order.customer.orderType === "pickup") return true;
  return order.paymentStatus === "paid";
}

export function paymentStatusForOrderStatus(status: OrderStatus): PlacedOrder["paymentStatus"] {
  if (status === "pending_payment") return "pending";
  return "paid";
}

export function syncStatuses(
  status: OrderStatus,
  paymentStatus: PlacedOrder["paymentStatus"],
): { status: OrderStatus; paymentStatus: PlacedOrder["paymentStatus"] } {
  if (paymentStatus === "failed") {
    return { status: "pending_payment", paymentStatus: "failed" };
  }
  return { status, paymentStatus };
}

export function initialOrderStatus(paymentMethod: PlacedOrder["paymentMethod"]): {
  status: OrderStatus;
  paymentStatus: PlacedOrder["paymentStatus"];
} {
  if (paymentMethod === "gcash") {
    return { status: "paid", paymentStatus: "paid" };
  }
  return { status: "pending_payment", paymentStatus: "pending" };
}
