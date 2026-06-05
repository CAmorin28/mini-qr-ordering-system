import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { mysqlNow } from "@/lib/db/row-utils";
import {
  GUEST_SESSION_MAX_AGE_SEC,
  createGuestSessionToken,
  generateGuestSessionId,
  guestSessionTokenFromRequest,
  type GuestSessionPayload,
} from "@/lib/guest-session-token";
import { normalizeTableLetter } from "@/lib/table-session";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

const TABLE = "table_qr_sessions";

interface TableQrRow {
  tableLetter: string;
  isOpen: boolean;
  sessionGeneration: number;
  activeSessionId: string | null;
  sessionExpiresAt: Date | null;
}

export interface TableVisitStatus {
  tableLetter: string;
  visitOpen: boolean;
  hasActiveOrders: boolean;
  canBind: boolean;
}

export interface TableSessionRecord {
  sessionId: string;
  tableLetter: string;
  sessionGeneration: number;
}

export type TableSessionIssueCode =
  | "session_locked"
  | "visit_closed"
  | "db_unavailable";

export type TableSessionIssueResult =
  | { ok: true; token: string; payload: GuestSessionPayload }
  | { ok: false; code: TableSessionIssueCode };

function isMissingTableError(message: string): boolean {
  return (
    message.includes(TABLE) &&
    (message.includes("doesn't exist") ||
      message.includes("does not exist") ||
      message.includes("Unknown table"))
  );
}

function rowToState(row: RowDataPacket | undefined, table: string): TableQrRow {
  if (!row) {
    return {
      tableLetter: table,
      isOpen: false,
      sessionGeneration: 0,
      activeSessionId: null,
      sessionExpiresAt: null,
    };
  }

  const expires =
    row.session_expires_at == null
      ? null
      : row.session_expires_at instanceof Date
        ? row.session_expires_at
        : new Date(row.session_expires_at);

  return {
    tableLetter: table,
    isOpen: Boolean(row.is_open),
    sessionGeneration: Number(row.session_generation ?? 0),
    activeSessionId: row.active_session_id ? String(row.active_session_id) : null,
    sessionExpiresAt: expires,
  };
}

function sessionExpired(expiresAt: Date | null): boolean {
  return expiresAt != null && expiresAt.getTime() <= Date.now();
}

function hasLiveDevice(row: TableQrRow): boolean {
  return Boolean(row.activeSessionId) && !sessionExpired(row.sessionExpiresAt);
}

async function loadTableRow(tableLetter: string): Promise<TableQrRow | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT table_number, is_open, session_generation, active_session_id, session_expires_at
       FROM ${TABLE} WHERE table_number = ? LIMIT 1`,
      [table],
    );
    return rowToState(rows[0], table);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) {
      return rowToState(undefined, table);
    }
    return null;
  }
}

async function hasActiveOrders(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;
  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT 1 FROM orders WHERE table_number = ? AND completed_at IS NULL LIMIT 1",
      [table],
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

function buildStatus(
  row: TableQrRow,
  hasOrders: boolean,
  requesterIsActiveDevice: boolean,
): TableVisitStatus {
  const visitOpen = row.isOpen;
  const occupied = hasLiveDevice(row);
  const canBind =
    visitOpen &&
    (requesterIsActiveDevice || (!hasOrders && !occupied));

  return {
    tableLetter: row.tableLetter,
    visitOpen,
    hasActiveOrders: hasOrders,
    canBind,
  };
}

export async function getTableVisitStatus(
  tableLetter: string,
  requesterIsActiveDevice = false,
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

  const row = await loadTableRow(table);
  if (!row) return null;

  if (row.activeSessionId && sessionExpired(row.sessionExpiresAt)) {
    await clearActiveSession(table);
    row.activeSessionId = null;
    row.sessionExpiresAt = null;
  }

  const hasOrders = await hasActiveOrders(table);
  return buildStatus(row, hasOrders, requesterIsActiveDevice);
}

export async function resolveTableVisitBinding(
  request: Request | null,
  tableLetter: string,
): Promise<TableVisitStatus | null> {
  const requesterActive =
    request != null && (await requesterHasTableGuestSession(request, tableLetter));
  return getTableVisitStatus(tableLetter, requesterActive);
}

export async function requesterHasTableGuestSession(
  request: Request,
  tableLetter: string,
): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return false;
  const payload = guestSessionTokenFromRequest(request);
  const record = await validateGuestSessionPayload(payload);
  return record != null && record.tableLetter === table;
}

export async function validateGuestSessionPayload(
  payload: GuestSessionPayload | null,
): Promise<TableSessionRecord | null> {
  if (!payload) return null;

  const table = normalizeTableLetter(payload.table);
  if (!table || !isDatabaseConfigured()) return null;

  const row = await loadTableRow(table);
  if (!row || !row.isOpen) return null;
  if (row.sessionGeneration !== Number(payload.gen)) return null;
  if (!row.activeSessionId || row.activeSessionId !== payload.sid) return null;
  if (sessionExpired(row.sessionExpiresAt)) {
    await clearActiveSession(table);
    return null;
  }

  return {
    sessionId: payload.sid,
    tableLetter: table,
    sessionGeneration: row.sessionGeneration,
  };
}

async function clearActiveSession(tableLetter: string): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return;
  try {
    const pool = getPool();
    await pool.query(
      `UPDATE ${TABLE}
       SET active_session_id = NULL, session_expires_at = NULL, updated_at = ?
       WHERE table_number = ?`,
      [mysqlNow(), table],
    );
  } catch {
    /* ignore */
  }
}

/** Admin completes order — close table and revoke all device access. */
export async function closeTableSession(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;

  try {
    const pool = getPool();
    const now = mysqlNow();
    await pool.query(
      `INSERT INTO ${TABLE}
         (table_number, is_open, session_generation, active_session_id, session_expires_at, closed_at, updated_at)
       VALUES (?, 0, 0, NULL, NULL, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_open = 0,
         active_session_id = NULL,
         session_expires_at = NULL,
         closed_at = VALUES(closed_at),
         updated_at = VALUES(updated_at)`,
      [table, now, now],
    );
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    return !isMissingTableError(message);
  }
}

export async function closeTableSessionIfNoActiveOrders(tableLetter: string): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return;
  if (await hasActiveOrders(table)) return;
  await closeTableSession(table);
}

/** Admin opens table for the next party — new generation, no active device. */
export async function openTableForNewGuests(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;

  if (await hasActiveOrders(table)) return false;

  try {
    const pool = getPool();
    const now = mysqlNow();
    await pool.query(
      `INSERT INTO ${TABLE}
         (table_number, is_open, session_generation, active_session_id, session_expires_at, opened_at, closed_at, updated_at)
       VALUES (?, 1, 1, NULL, NULL, ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
         is_open = 1,
         session_generation = session_generation + 1,
         active_session_id = NULL,
         session_expires_at = NULL,
         opened_at = VALUES(opened_at),
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

/** Claim or refresh the single active device slot for this table (QR scan). */
export async function claimTableSessionOnScan(
  request: Request,
  tableLetter: string,
): Promise<TableSessionIssueResult> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) {
    return { ok: false, code: "db_unavailable" };
  }

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT table_number, is_open, session_generation, active_session_id, session_expires_at
       FROM ${TABLE} WHERE table_number = ? FOR UPDATE`,
      [table],
    );

    if (!rows[0]) {
      await connection.rollback();
      return { ok: false, code: "visit_closed" };
    }

    let row = rowToState(rows[0], table);

    if (!row.isOpen) {
      await connection.rollback();
      return { ok: false, code: "visit_closed" };
    }

    if (row.activeSessionId && sessionExpired(row.sessionExpiresAt)) {
      row.activeSessionId = null;
      row.sessionExpiresAt = null;
    }

    const requesterPayload = guestSessionTokenFromRequest(request);

    if (hasLiveDevice(row)) {
      if (
        requesterPayload &&
        requesterPayload.table === table &&
        Number(requesterPayload.gen) === Number(row.sessionGeneration) &&
        requesterPayload.sid === row.activeSessionId
      ) {
        const exp = Date.now() + GUEST_SESSION_MAX_AGE_SEC * 1000;
        await connection.query(
          `UPDATE ${TABLE} SET session_expires_at = ?, updated_at = ? WHERE table_number = ?`,
          [new Date(exp), mysqlNow(), table],
        );
        await connection.commit();
        const payload: GuestSessionPayload = {
          sid: row.activeSessionId!,
          table,
          gen: row.sessionGeneration,
          exp,
        };
        return { ok: true, token: createGuestSessionToken(payload), payload };
      }

      await connection.rollback();
      return { ok: false, code: "session_locked" };
    }

    const sessionId = generateGuestSessionId();
    const exp = Date.now() + GUEST_SESSION_MAX_AGE_SEC * 1000;
    const generation = Number(row.sessionGeneration);

    const [updateResult] = await connection.query<ResultSetHeader>(
      `UPDATE ${TABLE}
       SET active_session_id = ?, session_expires_at = ?, updated_at = ?
       WHERE table_number = ? AND is_open = 1`,
      [sessionId, new Date(exp), mysqlNow(), table],
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return { ok: false, code: "visit_closed" };
    }

    await connection.commit();

    const payload: GuestSessionPayload = {
      sid: sessionId,
      table,
      gen: generation,
      exp,
    };
    return { ok: true, token: createGuestSessionToken(payload), payload };
  } catch (err) {
    await connection.rollback();
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) {
      return { ok: false, code: "db_unavailable" };
    }
    return { ok: false, code: "db_unavailable" };
  } finally {
    connection.release();
  }
}

/** Release this device's slot without closing the table (client sign-out). */
export async function releaseTableSessionIfMatches(
  tableLetter: string,
  sessionId: string | null,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !sessionId || !isDatabaseConfigured()) return;

  try {
    const pool = getPool();
    await pool.query(
      `UPDATE ${TABLE}
       SET active_session_id = NULL, session_expires_at = NULL, updated_at = ?
       WHERE table_number = ? AND active_session_id = ?`,
      [mysqlNow(), table, sessionId],
    );
  } catch {
    /* ignore */
  }
}

/** @param tableLetter Required — releases only when session id matches the table row. */
export async function revokeGuestSession(
  sessionId: string,
  tableLetter: string,
): Promise<void> {
  await releaseTableSessionIfMatches(tableLetter, sessionId);
}
