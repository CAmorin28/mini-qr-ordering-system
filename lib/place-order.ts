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
import { submitPlacedOrder } from "@/lib/api";

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

/** Paid GCash or confirmed COD (pay on delivery). Excludes failed / unpaid GCash. */
export function isPlacedOrder(order: PlacedOrder): boolean {
  if (order.paymentStatus === "failed") return false;
  if (order.paymentStatus === "paid") return true;
  if (order.paymentMethod === "cod" && order.status === "confirmed") return true;
  return order.status === "confirmed" || (order.status as string) === "placed";
}

/** Persists to Supabase via POST /api/orders; returns local order if API unavailable. */
export async function placeOrderWithSimulation(
  order: PlacedOrder,
): Promise<PlacedOrder> {
  try {
    const result = await submitPlacedOrder(order);
    return {
      ...order,
      orderId: result.orderId,
      orderNumber: formatOrderNumber(result.orderId),
    };
  } catch {
    return order;
  }
}
