import { syncStatuses } from "@/lib/order-workflow";
import type { OrderStatus, OrderType, PaymentStatus, PlacedOrder } from "@/lib/types";

const PH_TIMEZONE = "Asia/Manila";

export function terminalStatusForOrderType(orderType: OrderType): OrderStatus {
  return orderType === "dine_in" ? "served" : "ready_for_pickup";
}

/** Only paid orders can be archived or counted toward daily sales. */
export function canArchiveOrder(order: PlacedOrder): boolean {
  return order.paymentStatus === "paid";
}

export function countsTowardDailySales(order: PlacedOrder): boolean {
  return isCompletedOrder(order) && canArchiveOrder(order);
}

export function resolveOrderAfterAdminUpdate(
  existing: PlacedOrder,
  updates: { status?: OrderStatus; paymentStatus?: PaymentStatus },
): { status: OrderStatus; paymentStatus: PaymentStatus } {
  return syncStatuses(
    updates.status ?? existing.status,
    updates.paymentStatus ?? existing.paymentStatus,
  );
}

/** Auto-archive when workflow reaches served / ready for pick-up and payment is paid. */
export function shouldAutoArchiveOrder(
  existing: PlacedOrder,
  resolved: { status: OrderStatus; paymentStatus: PaymentStatus },
): boolean {
  if (!isActiveOrder(existing)) return false;
  if (resolved.paymentStatus !== "paid") return false;
  const terminal = terminalStatusForOrderType(existing.customer.orderType);
  return resolved.status === terminal;
}
export function isActiveOrder(order: PlacedOrder): boolean {
  return order.completedAt == null || order.completedAt === "";
}

export function isCompletedOrder(order: PlacedOrder): boolean {
  return !isActiveOrder(order);
}

export function filterActiveOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return orders.filter(isActiveOrder);
}

export function filterCompletedOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return orders
    .filter(isCompletedOrder)
    .sort(
      (a, b) =>
        new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime(),
    );
}

export function filterCompletedPaidOrders(orders: PlacedOrder[]): PlacedOrder[] {
  return filterCompletedOrders(orders).filter(canArchiveOrder);
}

/** Calendar date YYYY-MM-DD in Philippines time. */
export function localDateKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PH_TIMEZONE }).format(new Date(iso));
}

export function todayDateKey(): string {
  return localDateKey(new Date().toISOString());
}

export function completedOrdersForDay(
  orders: PlacedOrder[],
  dayKey: string,
): PlacedOrder[] {
  return filterCompletedOrders(orders).filter(
    (o) => o.completedAt && localDateKey(o.completedAt) === dayKey,
  );
}

export function sumGrandTotal(orders: PlacedOrder[]): number {
  return orders.reduce((sum, o) => sum + o.grandTotal, 0);
}

export interface DailyOrderSummary {
  count: number;
  totalAmount: number;
  orders: PlacedOrder[];
}

export function dailyCompletedSummary(
  orders: PlacedOrder[],
  dayKey: string,
): DailyOrderSummary {
  const dayOrders = completedOrdersForDay(orders, dayKey);
  const salesOrders = dayOrders.filter(canArchiveOrder);
  return {
    count: salesOrders.length,
    totalAmount: sumGrandTotal(salesOrders),
    orders: dayOrders,
  };
}
