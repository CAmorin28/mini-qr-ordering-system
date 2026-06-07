import type { CartLine, PaymentStatus } from "@/types";
import type { OrderRow } from "@/lib/db/order-mapper";
import type { RowDataPacket } from "mysql2";

/** MySQL TIMESTAMP rejects ISO strings (2026-06-05T02:58:19.455Z). */
export function toMysqlDatetime(
  value: string | Date | null | undefined,
): string | null {
  if (value == null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace("T", " ");
}

export function mysqlNow(): string {
  return toMysqlDatetime(new Date())!;
}

function toIso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseLines(value: unknown): CartLine[] {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as CartLine[];
    } catch {
      return [];
    }
  }
  if (Array.isArray(value)) return value as CartLine[];
  return [];
}

function normalizePaymentStatus(value: unknown): PaymentStatus {
  const normalized = String(value ?? "pending").trim().toLowerCase();
  if (normalized === "paid") return "paid";
  if (normalized === "failed") return "failed";
  return "pending";
}

export function normalizeOrderRow(row: RowDataPacket): OrderRow {
  return {
    order_id: String(row.order_id),
    order_number: String(row.order_number),
    created_at: toIso(row.created_at) ?? new Date().toISOString(),
    status: String(row.status),
    payment_status: normalizePaymentStatus(row.payment_status),
    payment_method: String(row.payment_method),
    order_type: row.order_type as OrderRow["order_type"],
    table_number: row.table_number != null ? String(row.table_number) : null,
    cutlery: Boolean(row.cutlery),
    subtotal: Number(row.subtotal),
    grand_total: Number(row.grand_total),
    customer_name: String(row.customer_name ?? ""),
    contact_number: String(row.contact_number ?? ""),
    notes: String(row.notes ?? ""),
    lines: parseLines(row.lines),
    ready_at: toIso(row.ready_at),
    completed_at: toIso(row.completed_at),
  };
}
