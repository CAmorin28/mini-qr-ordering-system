import type {
  CartLine,
  DeliveryDetails,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PlacedOrder,
} from "@/lib/types";
import {
  DELIVERY_FEE,
  SERVICE_FEE,
  computeGrandTotal,
  computeSubtotal,
  estimatedDeliveryLabel,
  formatOrderNumber,
} from "@/lib/checkout";
import { submitOrder } from "@/lib/api";

export function generateOrderId(): string {
  return `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

interface BuildOrderInput {
  orderId: string;
  lines: CartLine[];
  cutlery: boolean;
  paymentMethod: PaymentMethod;
  delivery: DeliveryDetails;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export function buildPlacedOrder({
  orderId,
  lines,
  cutlery,
  paymentMethod,
  delivery,
  status = "pending",
  paymentStatus = "pending",
}: BuildOrderInput): PlacedOrder {
  const subtotal = computeSubtotal(lines);
  return {
    orderId,
    orderNumber: formatOrderNumber(orderId),
    createdAt: new Date().toISOString(),
    status,
    paymentStatus,
    lines: lines.map((line) => ({
      item: { ...line.item },
      quantity: line.quantity,
    })),
    subtotal,
    deliveryFee: DELIVERY_FEE,
    serviceFee: SERVICE_FEE,
    taxes: 0,
    cutlery,
    paymentMethod,
    delivery: { ...delivery },
    grandTotal: computeGrandTotal(subtotal),
    estimatedDelivery: estimatedDeliveryLabel(),
  };
}

/** Simulation-first: always returns a placed order; syncs with API when available. */
export async function placeOrderWithSimulation(
  order: PlacedOrder,
): Promise<PlacedOrder> {
  try {
    const result = await submitOrder({
      items: order.lines.map((line) => ({
        menuItemId: line.item.id,
        quantity: line.quantity,
      })),
      total: order.subtotal,
    });
    return {
      ...order,
      orderId: result.orderId,
      orderNumber: formatOrderNumber(result.orderId),
    };
  } catch {
    return order;
  }
}
