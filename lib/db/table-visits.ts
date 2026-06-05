import { isDatabaseConfigured } from "@/lib/db/config";
import { revokeGuestSessionsForTable } from "@/lib/db/guest-sessions";
import { listOrdersFromDb } from "@/lib/db/orders";
import { getPool } from "@/lib/db/pool";
import { mysqlNow } from "@/lib/db/row-utils";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { normalizeTableLetter } from "@/lib/table-session";
import type { RowDataPacket } from "mysql2";

export interface TableVisitStatus {
  tableLetter: string;
  visitOpen: boolean;
  hasActiveOrders: boolean;
  canBind: boolean;
}

function isMissingTableError(message: string): boolean {
  return (
    message.includes("table_visits") &&
    (message.includes("doesn't exist") ||
      message.includes("does not exist") ||
      message.includes("Unknown table"))
  );
}

export async function getTableVisitStatus(
  tableLetter: string,
): Promise<TableVisitStatus | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  if (!isDatabaseConfigured()) {
    return {
      tableLetter: table,
      visitOpen: false,
      hasActiveOrders: false,
      canBind: true,
    };
  }

  let visitOpen = false;
  let visitRecorded = false;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT is_open FROM table_visits WHERE table_number = ? LIMIT 1",
      [table],
    );
    const row = rows[0];
    visitRecorded = row != null;
    visitOpen = Boolean(row?.is_open);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) {
      return {
        tableLetter: table,
        visitOpen: false,
        hasActiveOrders: false,
        canBind: true,
      };
    }
    return null;
  }

  let hasActiveOrders = false;
  try {
    const orders = await listOrdersFromDb({ activeOnly: true, tableLetter: table });
    hasActiveOrders = activePlacedOrdersForTable(orders, table).length > 0;
  } catch {
    return null;
  }

  return {
    tableLetter: table,
    visitOpen,
    hasActiveOrders,
    canBind: visitOpen || hasActiveOrders || !visitRecorded,
  };
}

export async function openTableVisit(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;

  try {
    const pool = getPool();
    const now = mysqlNow();
    await pool.query(
      `INSERT INTO table_visits (table_number, is_open, opened_at, closed_at, updated_at)
       VALUES (?, 1, ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
         is_open = 1,
         opened_at = IF(is_open = 1 AND opened_at IS NOT NULL, opened_at, VALUES(opened_at)),
         closed_at = NULL,
         updated_at = VALUES(updated_at)`,
      [table, now, now],
    );
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return !isMissingTableError(message);
  }
}

export async function closeTableVisit(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;

  try {
    const pool = getPool();
    const now = mysqlNow();
    await pool.query(
      `INSERT INTO table_visits (table_number, is_open, closed_at, updated_at)
       VALUES (?, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_open = 0,
         closed_at = VALUES(closed_at),
         updated_at = VALUES(updated_at)`,
      [table, now, now],
    );
    await revokeGuestSessionsForTable(table);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return !isMissingTableError(message);
  }
}

/** Milliseconds since epoch for the current visit's opened_at (null when visit is closed or missing). */
export async function getTableVisitOpenedAtMs(
  tableLetter: string,
): Promise<number | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT is_open, opened_at FROM table_visits WHERE table_number = ? LIMIT 1",
      [table],
    );
    const row = rows[0];
    if (!row || !row.is_open || !row.opened_at) return null;

    const openedAt =
      row.opened_at instanceof Date ? row.opened_at : new Date(row.opened_at);
    const ms = openedAt.getTime();
    return Number.isFinite(ms) ? ms : null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) return null;
    return null;
  }
}

export async function closeTableVisitIfNoActiveOrders(
  tableLetter: string,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return;

  try {
    const orders = await listOrdersFromDb({ activeOnly: true, tableLetter: table });
    const remaining = activePlacedOrdersForTable(orders, table);
    if (remaining.length > 0) return;
    await closeTableVisit(table);
  } catch {
    /* ignore */
  }
}
