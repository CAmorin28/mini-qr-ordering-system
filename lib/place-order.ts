import type {
  CartLine,
  CustomerDetails,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PlacedOrder,
} from "@/lib/types";
import {
  computeGrandTotal,
  computeSubtotal,
  formatOrderNumber,
} from "@/lib/checkout";
import { initialOrderStatus } from "@/lib/order-workflow";
import { submitPlacedOrder } from "@/lib/api";

export function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface BuildOrderInput {
  orderId: string;
  lines: CartLine[];
  cutlery: boolean;
  paymentMethod: PaymentMethod;
  customer: CustomerDetails;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export function buildPlacedOrder({
  orderId,
  lines,
  cutlery,
  paymentMethod,
  customer,
  status,
  paymentStatus,
}: BuildOrderInput): PlacedOrder {
  const subtotal = computeSubtotal(lines);
  const defaults = initialOrderStatus(paymentMethod);
  return {
    orderId,
    orderNumber: formatOrderNumber(orderId),
    createdAt: new Date().toISOString(),
    readyAt: null,
    completedAt: null,
    status: status ?? defaults.status,
    paymentStatus: paymentStatus ?? defaults.paymentStatus,
    lines: lines.map((line) => ({
      item: { ...line.item },
      quantity: line.quantity,
    })),
    subtotal,
    cutlery,
    paymentMethod,
    customer: { ...customer },
    grandTotal: computeGrandTotal(subtotal),
  };
}

/** Excludes failed mock payments. Cash and paid GCash orders count as placed. */
export function isPlacedOrder(order: PlacedOrder): boolean {
  return order.paymentStatus !== "failed";
}

/** Persists via POST /api/orders. Throws if the server cannot save the order. */
export async function placeOrderWithSimulation(
  order: PlacedOrder,
): Promise<PlacedOrder> {
  const result = await submitPlacedOrder(order);
  return {
    ...order,
    orderId: result.orderId,
    orderNumber: formatOrderNumber(result.orderId),
  };
}
