import type { CartLine } from "@/lib/types";

export const DELIVERY_FEE = 50;
export const SERVICE_FEE = 5;
export const ESTIMATED_DELIVERY_MIN = 35;
export const ESTIMATED_DELIVERY_MAX = 45;

export function lineSubtotal(line: CartLine): number {
  return line.item.price * line.quantity;
}

export function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function computeGrandTotal(subtotal: number): number {
  return subtotal + DELIVERY_FEE + SERVICE_FEE;
}

export function formatOrderNumber(orderId: string): string {
  const digits = orderId.replace(/\D/g, "").slice(-8).padStart(8, "0");
  return `TB-${digits}`;
}

export function estimatedDeliveryLabel(): string {
  return `${ESTIMATED_DELIVERY_MIN}–${ESTIMATED_DELIVERY_MAX} minutes`;
}
