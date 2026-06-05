import { isDatabaseConfigured } from "@/lib/db/config";
import { mapOrderRow, type OrderRow } from "@/lib/db/order-mapper";
import { getPool } from "@/lib/db/pool";
import { mysqlNow, normalizeOrderRow, toMysqlDatetime } from "@/lib/db/row-utils";
import {
  closeTableVisitIfNoActiveOrders,
  openTableVisit,
} from "@/lib/db/table-visits";
import {
  canArchiveOrder,
  canMarkOrderDone,
  hasReadyHandoff,
  resolveOrderAfterAdminUpdate,
} from "@/lib/order-completion";
import { normalizeTableLetter } from "@/lib/table-session";
import type { OrderStatus, PaymentStatus, PlacedOrder } from "@/lib/types";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

function rowToPlacedOrder(row: RowDataPacket): PlacedOrder {
  return mapOrderRow(normalizeOrderRow(row));
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

export interface ListOrdersOptions {
  activeOnly?: boolean;
  tableLetter?: string;
}

export interface OrderAdminUpdates {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  ready?: boolean;
  completed?: boolean;
}

const ORDER_COLUMNS = `
  order_id, order_number, created_at, status, payment_status, payment_method,
  order_type, table_number, cutlery, subtotal, grand_total,
  customer_name, contact_number, notes, \`lines\`, ready_at, completed_at
`;

export async function saveOrderToDb(order: PlacedOrder): Promise<SaveOrderResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, status: 503, error: "Database not configured" };
  }

  const row = orderToRow(order);

  try {
    const pool = getPool();
    const values: (string | number | null)[] = [
      row.order_id,
      row.order_number,
      toMysqlDatetime(row.created_at),
      row.status,
      row.payment_status,
      row.payment_method,
      row.order_type,
      row.table_number,
      row.cutlery ? 1 : 0,
      row.subtotal,
      row.grand_total,
      row.customer_name,
      row.contact_number,
      row.notes,
      JSON.stringify(row.lines),
      toMysqlDatetime(row.ready_at),
      toMysqlDatetime(row.completed_at),
    ];

    await pool.query(
      `INSERT INTO orders (
        order_id, order_number, created_at, status, payment_status, payment_method,
        order_type, table_number, cutlery, subtotal, grand_total,
        customer_name, contact_number, notes, \`lines\`, ready_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        order_number = VALUES(order_number),
        status = VALUES(status),
        payment_status = VALUES(payment_status),
        payment_method = VALUES(payment_method),
        order_type = VALUES(order_type),
        table_number = VALUES(table_number),
        cutlery = VALUES(cutlery),
        subtotal = VALUES(subtotal),
        grand_total = VALUES(grand_total),
        customer_name = VALUES(customer_name),
        contact_number = VALUES(contact_number),
        notes = VALUES(notes),
        \`lines\` = VALUES(\`lines\`),
        ready_at = VALUES(ready_at),
        completed_at = VALUES(completed_at)`,
      values,
    );

    const saved = await getOrderFromDb(order.orderId);
    if (!saved) {
      return { ok: false, status: 500, error: "Order saved but could not be loaded" };
    }

    const table = normalizeTableLetter(saved.customer.tableLetter);
    if (table) {
      await openTableVisit(table);
    }

    return { ok: true, order: saved };
  } catch (err) {
    return {
      ok: false,
      status: 500,
      error: err instanceof Error ? err.message : "Failed to save order",
    };
  }
}

export async function listOrdersFromDb(
  options: ListOrdersOptions = {},
): Promise<PlacedOrder[]> {
  if (!isDatabaseConfigured()) return [];

  const clauses: string[] = [];
  const params: (string | number)[] = [];

  if (options.activeOnly) {
    clauses.push("completed_at IS NULL");
  }

  const table = options.tableLetter?.trim().toUpperCase();
  if (table) {
    clauses.push("table_number = ?");
    params.push(table);
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${ORDER_COLUMNS} FROM orders ${where} ORDER BY created_at DESC LIMIT 300`,
      params,
    );
    return rows.map(rowToPlacedOrder);
  } catch {
    return [];
  }
}

export async function getOrderFromDb(orderId: string): Promise<PlacedOrder | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE order_id = ? LIMIT 1`,
      [orderId],
    );
    const row = rows[0];
    return row ? rowToPlacedOrder(row) : null;
  } catch {
    return null;
  }
}

export async function updateOrderInDb(
  orderId: string,
  updates: OrderAdminUpdates,
): Promise<SaveOrderResult> {
  if (!isDatabaseConfigured()) {
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
      error: "Order must be at served or ready for pick-up before marking done.",
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

  const setClauses: string[] = [];
  const params: (string | null)[] = [];

  if (updates.status !== undefined || updates.paymentStatus !== undefined) {
    setClauses.push("status = ?", "payment_status = ?");
    params.push(resolved.status, resolved.paymentStatus);
  }
  if (updates.ready === true) {
    setClauses.push("ready_at = ?");
    params.push(mysqlNow());
  }
  if (updates.completed === true) {
    setClauses.push("completed_at = ?");
    params.push(mysqlNow());
  }

  try {
    const pool = getPool();
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE orders SET ${setClauses.join(", ")} WHERE order_id = ?`,
      [...params, orderId],
    );

    if (result.affectedRows === 0) {
      return { ok: false, status: 404, error: "Order not found" };
    }

    const updated = await getOrderFromDb(orderId);
    if (!updated) {
      return { ok: false, status: 500, error: "Order updated but could not be loaded" };
    }

    if (updates.completed === true) {
      const table = normalizeTableLetter(updated.customer.tableLetter);
      if (table) {
        await closeTableVisitIfNoActiveOrders(table);
      }
    }

    return { ok: true, order: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update order";
    if (message.includes("Unknown column")) {
      return {
        ok: false,
        status: 503,
        error: "Database schema is out of date. Re-run database/schema-reference.sql.",
      };
    }
    return { ok: false, status: 500, error: message };
  }
}
