import type { CartLine } from "@/lib/types";

export function lineSubtotal(line: CartLine): number {
  return line.item.price * line.quantity;
}

export function computeSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function computeGrandTotal(subtotal: number): number {
  return subtotal;
}

export function formatOrderNumber(orderId: string): string {
  const digits = orderId.replace(/\D/g, "").slice(-8).padStart(8, "0");
  return `TB-${digits}`;
}
