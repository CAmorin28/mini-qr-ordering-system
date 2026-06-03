import { filterInProgressActiveOrders } from "@/lib/order-completion";
import type { OrderStatus, OrderType, PlacedOrder } from "@/lib/types";

export interface AdminBoardSection {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accentClass: string;
  orders: PlacedOrder[];
}

function byNewestFirst(a: PlacedOrder, b: PlacedOrder): number {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function activeOnly(orders: PlacedOrder[]): PlacedOrder[] {
  return filterInProgressActiveOrders(orders);
}

function forType(orders: PlacedOrder[], orderType: OrderType): PlacedOrder[] {
  return activeOnly(orders)
    .filter((o) => o.customer.orderType === orderType)
    .sort(byNewestFirst);
}

function healthy(orders: PlacedOrder[]): PlacedOrder[] {
  return orders.filter((o) => o.paymentStatus !== "failed");
}

function withStatus(orders: PlacedOrder[], status: OrderStatus): PlacedOrder[] {
  return healthy(orders).filter((o) => o.status === status).sort(byNewestFirst);
}

export function countByOrderType(orders: PlacedOrder[]): Record<OrderType, number> {
  const active = activeOnly(orders);
  return {
    dine_in: active.filter((o) => o.customer.orderType === "dine_in").length,
    pickup: active.filter((o) => o.customer.orderType === "pickup").length,
  };
}

export function activeOrderCount(orders: PlacedOrder[]): number {
  return activeOnly(orders).length;
}

export function inProgressCount(orders: PlacedOrder[], orderType: OrderType): number {
  return forType(orders, orderType).length;
}

export function paymentFailedCount(orders: PlacedOrder[]): number {
  return activeOnly(orders).filter((o) => o.paymentStatus === "failed").length;
}

function shouldShowSection(section: AdminBoardSection): boolean {
  return section.orders.length > 0;
}

function paymentFailedSection(orders: PlacedOrder[]): AdminBoardSection {
  return {
    id: "payment_failed",
    title: "Payment failed",
    subtitle: "Resolve payment before continuing the order workflow",
    icon: "error",
    accentClass: "border-error/30 bg-error-container/15",
    orders: orders.filter((o) => o.paymentStatus === "failed").sort(byNewestFirst),
  };
}

function dineInSections(typed: PlacedOrder[]): AdminBoardSection[] {
  return [
    paymentFailedSection(typed),
    {
      id: "pending_payment",
      title: "Awaiting payment",
      subtitle: "Unpaid — confirm GCash or collect cash at table",
      icon: "payments",
      accentClass: "border-amber-200/70 bg-amber-50/40",
      orders: withStatus(typed, "pending_payment"),
    },
    {
      id: "paid",
      title: "Paid — waiting for kitchen",
      subtitle: "Payment confirmed — ready to start preparing",
      icon: "check_circle",
      accentClass: "border-emerald-200/70 bg-emerald-50/40",
      orders: withStatus(typed, "paid"),
    },
    {
      id: "preparing",
      title: "Preparing",
      subtitle: "Kitchen is working on this order",
      icon: "skillet",
      accentClass: "border-sky-200/70 bg-sky-50/40",
      orders: withStatus(typed, "preparing"),
    },
    {
      id: "serving",
      title: "Serving",
      subtitle: "Food is being brought to the table",
      icon: "room_service",
      accentClass: "border-violet-200/70 bg-violet-50/40",
      orders: withStatus(typed, "serving"),
    },
    {
      id: "served",
      title: "Served",
      subtitle: "Food served — confirm payment, then complete from Ready to complete",
      icon: "done_all",
      accentClass: "border-surface-variant bg-surface-container-low/60",
      orders: withStatus(typed, "served"),
    },
  ];
}

function pickupSections(typed: PlacedOrder[]): AdminBoardSection[] {
  return [
    paymentFailedSection(typed),
    {
      id: "pending_payment",
      title: "Awaiting payment",
      subtitle: "Unpaid — GCash online or cash on pick-up",
      icon: "payments",
      accentClass: "border-amber-200/70 bg-amber-50/40",
      orders: withStatus(typed, "pending_payment"),
    },
    {
      id: "paid",
      title: "Paid — waiting for kitchen",
      subtitle: "Payment confirmed — ready to start preparing",
      icon: "check_circle",
      accentClass: "border-emerald-200/70 bg-emerald-50/40",
      orders: withStatus(typed, "paid"),
    },
    {
      id: "preparing",
      title: "Preparing",
      subtitle: "Kitchen is working on this order",
      icon: "skillet",
      accentClass: "border-sky-200/70 bg-sky-50/40",
      orders: withStatus(typed, "preparing"),
    },
    {
      id: "ready_for_pickup",
      title: "Ready for pick-up",
      subtitle: "Waiting for customer — confirm payment, then complete from Ready to complete",
      icon: "takeout_dining",
      accentClass: "border-teal-200/70 bg-teal-50/40",
      orders: withStatus(typed, "ready_for_pickup"),
    },
  ];
}

export function buildAdminBoardSections(
  orders: PlacedOrder[],
  orderType: OrderType,
): AdminBoardSection[] {
  const typed = forType(orders, orderType);
  const sections = orderType === "dine_in" ? dineInSections(typed) : pickupSections(typed);
  return sections.filter(shouldShowSection);
}

export function hasVisibleBoardOrders(orders: PlacedOrder[], orderType: OrderType): boolean {
  return buildAdminBoardSections(orders, orderType).some((s) => s.orders.length > 0);
}
