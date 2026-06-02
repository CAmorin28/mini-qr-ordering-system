import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeOrderStatus } from "@/lib/order-labels";
import type {
  CartLine,
  CustomerDetails,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  PlacedOrder,
} from "@/lib/types";

interface OrderRow {
  order_id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: PaymentStatus;
  payment_method: string;
  order_type: OrderType;
  table_number: string | null;
  cutlery: boolean;
  subtotal: number;
  grand_total: number;
  customer_name: string;
  contact_number: string;
  notes: string;
  lines: CartLine[];
  /** Legacy columns — may exist on older databases. */
  delivery_fee?: number;
  service_fee?: number;
  address?: string;
  estimated_delivery?: string;
}

function normalizePaymentMethod(method: string): PaymentMethod {
  if (method === "gcash") return "gcash";
  return "cash";
}

function rowToPlacedOrder(row: OrderRow): PlacedOrder {
  const subtotal = Number(row.subtotal);
  const legacyFees =
    Number(row.delivery_fee ?? 0) + Number(row.service_fee ?? 0);
  const grandTotal =
    row.grand_total != null
      ? Number(row.grand_total)
      : subtotal + legacyFees;

  const customer: CustomerDetails = {
    fullName: row.customer_name ?? "",
    contactNumber: row.contact_number ?? "",
    notes: row.notes ?? "",
    orderType: row.order_type ?? "dine_in",
    tableLetter: row.table_number ?? "",
  };

  return {
    orderId: row.order_id,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: normalizeOrderStatus(row.status, customer.orderType),
    paymentStatus: row.payment_status,
    lines: row.lines,
    subtotal,
    cutlery: row.cutlery,
    paymentMethod: normalizePaymentMethod(row.payment_method),
    customer,
    grandTotal,
  };
}

function orderToRow(order: PlacedOrder): Omit<OrderRow, "delivery_fee" | "service_fee" | "address" | "estimated_delivery"> {
  return {
    order_id: order.orderId,
    order_number: order.orderNumber,
    created_at: order.createdAt,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    order_type: order.customer.orderType,
    table_number: order.customer.tableLetter.trim() || null,
    cutlery: order.cutlery,
    subtotal: order.subtotal,
    grand_total: order.grandTotal,
    customer_name: order.customer.fullName,
    contact_number: order.customer.contactNumber,
    notes: order.customer.notes ?? "",
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
