import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { CartLine, OrderStatus, PaymentStatus, PlacedOrder } from "@/lib/types";

interface OrderRow {
  order_id: string;
  order_number: string;
  created_at: string;
  status: PlacedOrder["status"];
  payment_status: PlacedOrder["paymentStatus"];
  payment_method: PlacedOrder["paymentMethod"];
  cutlery: boolean;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  taxes: number;
  grand_total: number;
  estimated_delivery: string;
  customer_name: string;
  contact_number: string;
  address: string;
  notes: string;
  lines: CartLine[];
}

function rowToPlacedOrder(row: OrderRow): PlacedOrder {
  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    lines: row.lines,
    subtotal: Number(row.subtotal),
    deliveryFee: Number(row.delivery_fee),
    serviceFee: Number(row.service_fee),
    taxes: Number(row.taxes),
    cutlery: row.cutlery,
    paymentMethod: row.payment_method,
    delivery: {
      fullName: row.customer_name,
      contactNumber: row.contact_number,
      address: row.address,
      notes: row.notes ?? "",
    },
    grandTotal: Number(row.grand_total),
    estimatedDelivery: row.estimated_delivery,
  };
}

function orderToRow(order: PlacedOrder): OrderRow {
  return {
    order_id: order.orderId,
    order_number: order.orderNumber,
    created_at: order.createdAt,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    cutlery: order.cutlery,
    subtotal: order.subtotal,
    delivery_fee: order.deliveryFee,
    service_fee: order.serviceFee,
    taxes: order.taxes,
    grand_total: order.grandTotal,
    estimated_delivery: order.estimatedDelivery,
    customer_name: order.delivery.fullName,
    contact_number: order.delivery.contactNumber,
    address: order.delivery.address,
    notes: order.delivery.notes ?? "",
    lines: order.lines,
  };
}

export type SaveOrderResult =
  | { ok: true; order: PlacedOrder }
  | { ok: false; status: number; error: string };

export async function saveOrderToDb(order: PlacedOrder): Promise<SaveOrderResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: "Database not configured" };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .upsert(orderToRow(order), { onConflict: "order_id" })
      .select()
      .single();

    if (error) {
      return { ok: false, status: 500, error: error.message };
    }

    return { ok: true, order: rowToPlacedOrder(data as OrderRow) };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to save order",
    };
  }
}

export async function listOrdersFromDb(): Promise<PlacedOrder[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data.map((row) => rowToPlacedOrder(row as OrderRow));
}

export async function getOrderFromDb(orderId: string): Promise<PlacedOrder | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToPlacedOrder(data as OrderRow);
}

export interface OrderAdminUpdates {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

export async function updateOrderInDb(
  orderId: string,
  updates: OrderAdminUpdates,
): Promise<SaveOrderResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: "Database not configured" };
  }

  if (updates.status === undefined && updates.paymentStatus === undefined) {
    return { ok: false, status: 400, error: "No updates provided" };
  }

  const patch: Partial<Pick<OrderRow, "status" | "payment_status">> = {};
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.paymentStatus !== undefined) patch.payment_status = updates.paymentStatus;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("orders")
      .update(patch)
      .eq("order_id", orderId)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { ok: false, status: 404, error: "Order not found" };
      }
      return { ok: false, status: 500, error: error.message };
    }

    return { ok: true, order: rowToPlacedOrder(data as OrderRow) };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to update order",
    };
  }
}
