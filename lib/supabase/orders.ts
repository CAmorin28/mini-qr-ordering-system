import { isSupabaseConfigured } from "@/lib/supabase/config";
import { mapOrderRow, type OrderRow } from "@/lib/supabase/order-mapper";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizeTableLetter } from "@/lib/table-session";
import {
  canArchiveOrder,
  canMarkOrderDone,
  hasReadyHandoff,
  resolveOrderAfterAdminUpdate,
} from "@/lib/order-completion";
import type { OrderStatus, PaymentStatus, PlacedOrder } from "@/lib/types";

function rowToPlacedOrder(row: OrderRow): PlacedOrder {
  return mapOrderRow(row);
}

function orderToRow(order: PlacedOrder): Omit<OrderRow, "delivery_fee" | "service_fee"> {
  return {
    order_id: order.orderId,
    order_number: order.orderNumber,
    created_at: order.createdAt,
    ready_at: order.readyAt,
    completed_at: order.completedAt,
    status: order.status,
    payment_status: order.paymentStatus,
    payment_method: order.paymentMethod,
    order_type: order.customer.orderType,
    table_number: normalizeTableLetter(order.customer.tableLetter) || null,
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

export interface ListOrdersOptions {
  /** When true, only orders without completed_at (current table visits). */
  activeOnly?: boolean;
  tableLetter?: string;
}

export async function listOrdersFromDb(
  options: ListOrdersOptions = {},
): Promise<PlacedOrder[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = getSupabaseAdmin();
  let query = supabase.from("orders").select("*");

  if (options.activeOnly) {
    query = query.is("completed_at", null);
  }

  const table = options.tableLetter?.trim().toUpperCase();
  if (table) {
    query = query.eq("table_number", table);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(300);

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
  /** When true, sets ready_at (moves order to Ready to complete). */
  ready?: boolean;
  /** When true, sets completed_at to now (archives the order in admin). */
  completed?: boolean;
}

export async function updateOrderInDb(
  orderId: string,
  updates: OrderAdminUpdates,
): Promise<SaveOrderResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, status: 503, error: "Database not configured" };
  }

  if (
    updates.status === undefined &&
    updates.paymentStatus === undefined &&
    updates.ready !== true &&
    updates.completed !== true
  ) {
    return { ok: false, status: 400, error: "No updates provided" };
  }

  const existing = await getOrderFromDb(orderId);
  if (!existing) {
    return { ok: false, status: 404, error: "Order not found" };
  }

  const resolved = resolveOrderAfterAdminUpdate(existing, updates);
  const merged = { ...existing, ...resolved };

  if (updates.ready === true && !canMarkOrderDone(merged)) {
    return {
      ok: false,
      status: 400,
      error:
        "Order must be at served or ready for pick-up before marking done.",
    };
  }

  if (updates.completed === true && !hasReadyHandoff(merged)) {
    return {
      ok: false,
      status: 400,
      error: "Tap Done on Active orders first to move this order to Ready to complete.",
    };
  }

  if (updates.completed === true && !canArchiveOrder(merged)) {
    return {
      ok: false,
      status: 400,
      error: "Order must be paid before it can be completed.",
    };
  }

  const patch: Partial<
    Pick<OrderRow, "status" | "payment_status" | "ready_at" | "completed_at">
  > = {};
  if (updates.status !== undefined || updates.paymentStatus !== undefined) {
    patch.status = resolved.status;
    patch.payment_status = resolved.paymentStatus;
  }
  if (updates.ready === true) {
    patch.ready_at = new Date().toISOString();
  }
  if (updates.completed === true) {
    patch.completed_at = new Date().toISOString();
  }

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
      if (
        (error.message.includes("completed_at") || error.message.includes("ready_at")) &&
        (error.message.includes("column") || error.code === "42703")
      ) {
        return {
          ok: false,
          status: 503,
          error:
            "Database missing ready_at or completed_at. Run supabase/migrate-order-ready.sql and migrate-order-completion.sql in Supabase SQL Editor.",
        };
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
