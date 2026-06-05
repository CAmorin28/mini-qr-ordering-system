import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { mysqlNow, normalizeVisitOpenedAtMs } from "@/lib/db/row-utils";
import {
  GUEST_SESSION_MAX_AGE_SEC,
  createGuestSessionToken,
  generateGuestSessionId,
  guestSessionTokenFromRequest,
  type GuestSessionPayload,
} from "@/lib/guest-session-token";
import { normalizeTableLetter } from "@/lib/table-session";
import type { RowDataPacket } from "mysql2";

export interface GuestSessionRecord {
  sessionId: string;
  tableLetter: string;
  visitOpenedAtMs: number;
  expiresAt: Date;
}

function isMissingTableError(message: string): boolean {
  return (
    message.includes("guest_qr_sessions") &&
    (message.includes("doesn't exist") ||
      message.includes("does not exist") ||
      message.includes("Unknown table"))
  );
}

async function getVisitOpenedAtMs(tableLetter: string): Promise<number | null> {
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
    return Number.isFinite(ms) ? normalizeVisitOpenedAtMs(ms) : null;
  } catch {
    return null;
  }
}

export type GuestSessionIssueCode =
  | "session_locked"
  | "visit_unavailable"
  | "db_unavailable";

export type GuestSessionIssueResult =
  | { ok: true; token: string; payload: GuestSessionPayload }
  | { ok: false; code: GuestSessionIssueCode };

export async function getActiveGuestSessionForTable(
  tableLetter: string,
): Promise<GuestSessionRecord | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT session_id, table_number, visit_opened_at, expires_at
       FROM guest_qr_sessions
       WHERE table_number = ? AND expires_at > ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [table, mysqlNow()],
    );
    const row = rows[0];
    if (!row) return null;

    const visitOpenedAt = normalizeVisitOpenedAtMs(
      row.visit_opened_at instanceof Date
        ? row.visit_opened_at.getTime()
        : new Date(row.visit_opened_at).getTime(),
    );

    return {
      sessionId: String(row.session_id),
      tableLetter: normalizeTableLetter(String(row.table_number)),
      visitOpenedAtMs: visitOpenedAt,
      expiresAt: row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) return null;
    return null;
  }
}

async function persistGuestSession(
  sessionId: string,
  table: string,
  visitOpenedAtMs: number,
  expiresAt: Date,
): Promise<boolean> {
  try {
    const pool = getPool();
    const now = mysqlNow();
    await pool.query(
      `INSERT INTO guest_qr_sessions
         (session_id, table_number, visit_opened_at, created_at, expires_at, last_seen_at)
       VALUES (?, ?, FROM_UNIXTIME(? / 1000), ?, ?, ?)`,
      [sessionId, table, visitOpenedAtMs, now, expiresAt, now],
    );
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) return false;
    throw err;
  }
}

async function refreshGuestSessionToken(
  record: GuestSessionRecord,
): Promise<{ token: string; payload: GuestSessionPayload } | null> {
  const exp = Date.now() + GUEST_SESSION_MAX_AGE_SEC * 1000;
  const payload: GuestSessionPayload = {
    sid: record.sessionId,
    table: record.tableLetter,
    visitOpenedAtMs: record.visitOpenedAtMs,
    exp,
  };

  try {
    const pool = getPool();
    await pool.query(
      "UPDATE guest_qr_sessions SET expires_at = ?, last_seen_at = ? WHERE session_id = ?",
      [new Date(exp), mysqlNow(), record.sessionId],
    );
    return { token: createGuestSessionToken(payload), payload };
  } catch {
    return null;
  }
}

/**
 * Bind the first scanning device to this table visit.
 * Rejects additional devices even if they open a shared /menu/enter link.
 */
export async function issueGuestSessionForScan(
  request: Request,
  tableLetter: string,
): Promise<GuestSessionIssueResult> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) {
    return { ok: false, code: "db_unavailable" };
  }

  const visitOpenedAtMs = await getVisitOpenedAtMs(table);
  if (visitOpenedAtMs == null) {
    return { ok: false, code: "visit_unavailable" };
  }

  const requesterPayload = guestSessionTokenFromRequest(request);
  const requesterRecord = await validateGuestSessionPayload(requesterPayload);
  const existing = await getActiveGuestSessionForTable(table);

  if (existing) {
    if (
      requesterRecord &&
      requesterRecord.sessionId === existing.sessionId &&
      requesterRecord.tableLetter === table
    ) {
      const refreshed = await refreshGuestSessionToken(existing);
      if (refreshed) return { ok: true, ...refreshed };
      return { ok: false, code: "db_unavailable" };
    }
    return { ok: false, code: "session_locked" };
  }

  const sessionId = generateGuestSessionId();
  const exp = Date.now() + GUEST_SESSION_MAX_AGE_SEC * 1000;
  const payload: GuestSessionPayload = {
    sid: sessionId,
    table,
    visitOpenedAtMs,
    exp,
  };
  const expiresAt = new Date(exp);
  const inserted = await persistGuestSession(sessionId, table, visitOpenedAtMs, expiresAt);
  if (!inserted) {
    return { ok: false, code: "db_unavailable" };
  }

  return { token: createGuestSessionToken(payload), payload, ok: true };
}

export async function getGuestSessionRecord(
  sessionId: string,
): Promise<GuestSessionRecord | null> {
  if (!sessionId || !isDatabaseConfigured()) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT session_id, table_number, visit_opened_at, expires_at
       FROM guest_qr_sessions
       WHERE session_id = ?
       LIMIT 1`,
      [sessionId],
    );
    const row = rows[0];
    if (!row) return null;

    const expiresAt = row.expires_at instanceof Date ? row.expires_at : new Date(row.expires_at);
    if (expiresAt.getTime() <= Date.now()) {
      await revokeGuestSession(sessionId);
      return null;
    }

    const visitOpenedAt = normalizeVisitOpenedAtMs(
      row.visit_opened_at instanceof Date
        ? row.visit_opened_at.getTime()
        : new Date(row.visit_opened_at).getTime(),
    );

    return {
      sessionId: String(row.session_id),
      tableLetter: normalizeTableLetter(String(row.table_number)),
      visitOpenedAtMs: visitOpenedAt,
      expiresAt,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (isMissingTableError(message)) return null;
    return null;
  }
}

export async function touchGuestSession(sessionId: string): Promise<void> {
  if (!sessionId || !isDatabaseConfigured()) return;
  try {
    const pool = getPool();
    await pool.query("UPDATE guest_qr_sessions SET last_seen_at = ? WHERE session_id = ?", [
      mysqlNow(),
      sessionId,
    ]);
  } catch {
    /* ignore */
  }
}

export async function revokeGuestSession(sessionId: string): Promise<void> {
  if (!sessionId || !isDatabaseConfigured()) return;
  try {
    const pool = getPool();
    await pool.query("DELETE FROM guest_qr_sessions WHERE session_id = ?", [sessionId]);
  } catch {
    /* ignore */
  }
}

export async function revokeGuestSessionsForTable(tableLetter: string): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return;
  try {
    const pool = getPool();
    await pool.query("DELETE FROM guest_qr_sessions WHERE table_number = ?", [table]);
  } catch {
    /* ignore */
  }
}

export async function validateGuestSessionPayload(
  payload: GuestSessionPayload | null,
): Promise<GuestSessionRecord | null> {
  if (!payload) return null;

  const record = await getGuestSessionRecord(payload.sid);
  if (!record) return null;
  if (record.tableLetter !== normalizeTableLetter(payload.table)) return null;
  const payloadVisitOpenedAtMs = normalizeVisitOpenedAtMs(payload.visitOpenedAtMs);
  if (record.visitOpenedAtMs !== payloadVisitOpenedAtMs) return null;

  const currentVisitOpenedAt = await getVisitOpenedAtMs(record.tableLetter);
  if (currentVisitOpenedAt == null || currentVisitOpenedAt !== payloadVisitOpenedAtMs) {
    await revokeGuestSession(payload.sid);
    return null;
  }

  await touchGuestSession(payload.sid);
  return record;
}
