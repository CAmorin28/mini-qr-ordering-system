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

/** Keep kitchen status valid for dine-in vs pick-up (fixes legacy / mismatched DB values). */
export function coerceStatusForOrderType(
  status: OrderStatus,
  orderType: OrderType,
): OrderStatus {
  const flow = statusFlowForOrderType(orderType);
  if (flow.includes(status)) return status;

  if (orderType === "pickup") {
    if (status === "serving") return "preparing";
    if (status === "served") return "ready_for_pickup";
  } else if (status === "ready_for_pickup") {
    return "served";
  }

  return flow.includes(status) ? status : "pending_payment";
}

function kitchenStatusFlow(orderType: OrderType): OrderStatus[] {
  return statusFlowForOrderType(orderType).filter(
    (s) => s !== "paid" && s !== "pending_payment",
  );
}

export function getNextStatus(order: PlacedOrder): OrderStatus | null {
  if (order.status === "pending_payment" || order.status === "paid") {
    return "preparing";
  }
  const flow = kitchenStatusFlow(order.customer.orderType);
  const index = flow.indexOf(order.status);
  if (index < 0 || index >= flow.length - 1) return null;
  return flow[index + 1] ?? null;
}

/** Kitchen may start before payment (cash / pay later — dine-in and pick-up). */
export function canStartPreparing(_order: PlacedOrder): boolean {
  return true;
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
  if (paymentStatus === "paid" && status === "pending_payment") {
    return { status: "paid", paymentStatus: "paid" };
  }
  if (paymentStatus === "pending" && status === "paid") {
    return { status: "pending_payment", paymentStatus: "pending" };
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
