import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/admin-api-route";
import { isDatabaseConfigured } from "@/lib/db/config";
import { updateOrderInDb } from "@/lib/db/orders";
import type { OrderStatus, PaymentStatus } from "@/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "serving",
  "served",
  "ready_for_pickup",
];
const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"];

function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && ORDER_STATUSES.includes(value as OrderStatus);
}

function isPaymentStatus(value: unknown): value is PaymentStatus {
  return typeof value === "string" && PAYMENT_STATUSES.includes(value as PaymentStatus);
}

/** PATCH /api/admin/orders/:orderId — update order / payment status */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { orderId: rawId } = await context.params;
  const orderId = decodeURIComponent(rawId);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as {
    status?: unknown;
    paymentStatus?: unknown;
    ready?: unknown;
    completed?: unknown;
  };
  const status = payload.status !== undefined ? payload.status : undefined;
  const paymentStatus =
    payload.paymentStatus !== undefined ? payload.paymentStatus : undefined;
  const ready = payload.ready === true ? true : undefined;
  const completed = payload.completed === true ? true : undefined;

  if (status !== undefined && !isOrderStatus(status)) {
    return NextResponse.json({ error: "Invalid order status" }, { status: 400 });
  }
  if (paymentStatus !== undefined && !isPaymentStatus(paymentStatus)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }

  const result = await updateOrderInDb(orderId, {
    status: status as OrderStatus | undefined,
    paymentStatus: paymentStatus as PaymentStatus | undefined,
    ready,
    completed,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ order: result.order });
}
