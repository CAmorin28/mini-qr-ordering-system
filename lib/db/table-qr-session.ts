import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { mysqlNow } from "@/lib/db/row-utils";
import {
  GUEST_SESSION_IDLE_TIMEOUT_SEC,
  GUEST_SESSION_MAX_AGE_SEC,
  createGuestSessionToken,
  generateGuestSessionId,
  guestSessionTokenFromRequest,
  type GuestSessionPayload,
} from "@/lib/guest-session-token";
import { normalizeTableLetter } from "@/lib/table-session";
import {
  generateGuestDeviceId,
  guestDeviceIdFromRequest,
  normalizeGuestDeviceId,
} from "@/lib/guest-device-id";
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

const VISITS_TABLE = "table_qr_visits";
const ACTIVE_TABLE = "qr_sessions";
const ENDED_TABLE = "qr_ended_sessions";

type SessionEndReason =
  | "expired"
  | "released"
  | "table_closed"
  | "new_guests";

type DbExecutor = Pool | PoolConnection;

interface TableVisitRow {
  tableLetter: string;
  isOpen: boolean;
  sessionGeneration: number;
}

interface ActiveQrSessionRow {
  sessionId: string;
  deviceId: string;
  sessionGeneration: number;
  expiresAt: Date;
  startedAt: Date | null;
  updatedAt: Date;
}

interface TableSessionState {
  tableLetter: string;
  isOpen: boolean;
  sessionGeneration: number;
  activeSessionId: string | null;
  activeDeviceId: string | null;
  sessionExpiresAt: Date | null;
  sessionUpdatedAt: Date | null;
}

export interface TableVisitStatus {
  tableLetter: string;
  visitOpen: boolean;
  hasActiveOrders: boolean;
  canBind: boolean;
}

export interface TableSessionSummary extends TableVisitStatus {
  sessionOccupied: boolean;
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
  | { ok: true; token: string; payload: GuestSessionPayload; deviceId: string }
  | { ok: false; code: TableSessionIssueCode; detail?: string };

let qrSchemaReady: boolean | null = null;

const QR_VISITS_DDL = `
  CREATE TABLE IF NOT EXISTS ${VISITS_TABLE} (
    table_number VARCHAR(1) PRIMARY KEY,
    is_open TINYINT(1) NOT NULL DEFAULT 0,
    session_generation BIGINT UNSIGNED NOT NULL DEFAULT 0,
    opened_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX table_qr_visits_open_idx (is_open)
  )`;

const QR_ACTIVE_DDL = `
  CREATE TABLE IF NOT EXISTS ${ACTIVE_TABLE} (
    table_number VARCHAR(1) PRIMARY KEY,
    session_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    session_generation BIGINT UNSIGNED NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY qr_sessions_session_id_idx (session_id),
    INDEX qr_sessions_device_idx (device_id),
    INDEX qr_sessions_expires_idx (expires_at),
    INDEX qr_sessions_updated_idx (updated_at)
  )`;

const QR_ENDED_DDL = `
  CREATE TABLE IF NOT EXISTS ${ENDED_TABLE} (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_number VARCHAR(1) NOT NULL,
    session_id VARCHAR(64) NOT NULL,
    device_id VARCHAR(64) NOT NULL,
    session_generation BIGINT UNSIGNED NOT NULL,
    end_reason ENUM('expired', 'released', 'table_closed', 'new_guests') NOT NULL,
    started_at TIMESTAMP NULL,
    ended_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX qr_ended_table_idx (table_number),
    INDEX qr_ended_ended_at_idx (ended_at),
    INDEX qr_ended_device_idx (device_id)
  )`;

async function ensureQrSessionsUpdatedAtColumn(pool: Pool): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = 'updated_at'
     LIMIT 1`,
    [ACTIVE_TABLE],
  );
  if (rows.length > 0) return;

  await pool.query(
    `ALTER TABLE ${ACTIVE_TABLE}
     ADD COLUMN updated_at TIMESTAMP NOT NULL
       DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
     AFTER started_at`,
  );
}

export function dbUnavailableMessage(detail?: string): string {
  const msg = detail?.toLowerCase() ?? "";
  if (msg.includes("too many connections")) {
    return "Database connection limit reached. Restart MySQL and the dev server, then try again.";
  }
  if (msg.includes("connect econnrefused") || msg.includes("connect etimedout")) {
    return "Cannot reach MySQL. Start MySQL Workbench service and check .env.local.";
  }
  if (msg.includes("unknown column") || msg.includes("doesn't exist")) {
    return "QR session tables are outdated. Run database/schema.sql in MySQL Workbench.";
  }
  return "Could not start table session. Run database/schema.sql in MySQL Workbench.";
}

function sessionExpired(expiresAt: Date | null): boolean {
  return expiresAt != null && expiresAt.getTime() <= Date.now();
}

/** Idle cutoff is evaluated in MySQL (NOW()) to avoid JS/timezone skew on TIMESTAMP columns. */
function idleSessionSqlClause(column = "updated_at"): string {
  return `${column} > DATE_SUB(NOW(), INTERVAL ${GUEST_SESSION_IDLE_TIMEOUT_SEC} SECOND)`;
}

function hasLiveDevice(state: TableSessionState): boolean {
  return Boolean(state.activeSessionId) && !sessionExpired(state.sessionExpiresAt);
}

function toTimestamp(value: Date | string | null | undefined): Date | null {
  if (value == null) return null;
  return value instanceof Date ? value : new Date(value);
}

function visitRowToState(row: RowDataPacket | undefined, table: string): TableVisitRow {
  if (!row) {
    return { tableLetter: table, isOpen: false, sessionGeneration: 0 };
  }
  return {
    tableLetter: table,
    isOpen: Boolean(row.is_open),
    sessionGeneration: Number(row.session_generation ?? 0),
  };
}

function activeRowToState(row: RowDataPacket | undefined): ActiveQrSessionRow | null {
  if (!row) return null;
  const expiresAt = toTimestamp(row.expires_at);
  if (!expiresAt) return null;
  const updatedAt =
    toTimestamp(row.updated_at) ?? toTimestamp(row.started_at) ?? expiresAt;

  return {
    sessionId: String(row.session_id),
    deviceId: String(row.device_id),
    sessionGeneration: Number(row.session_generation ?? 0),
    expiresAt,
    startedAt: toTimestamp(row.started_at),
    updatedAt,
  };
}

function mergeState(
  visit: TableVisitRow,
  active: ActiveQrSessionRow | null,
): TableSessionState {
  if (active && active.sessionGeneration !== visit.sessionGeneration) {
    active = null;
  }

  return {
    tableLetter: visit.tableLetter,
    isOpen: visit.isOpen,
    sessionGeneration: visit.sessionGeneration,
    activeSessionId: active?.sessionId ?? null,
    activeDeviceId: active?.deviceId ?? null,
    sessionExpiresAt: active?.expiresAt ?? null,
    sessionUpdatedAt: active?.updatedAt ?? null,
  };
}

async function ensureQrSessionSchema(): Promise<boolean> {
  if (qrSchemaReady === true) return true;
  if (!isDatabaseConfigured()) return false;

  try {
    const pool = getPool();
    await pool.query(QR_VISITS_DDL);
    await pool.query(QR_ACTIVE_DDL);
    await pool.query(QR_ENDED_DDL);
    await ensureQrSessionsUpdatedAtColumn(pool);
    await pool.query(`SELECT table_number FROM ${VISITS_TABLE} LIMIT 1`);
    await pool.query(`SELECT table_number, updated_at FROM ${ACTIVE_TABLE} LIMIT 1`);
    qrSchemaReady = true;
    return true;
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.error("[ensureQrSessionSchema]", err);
    }
    qrSchemaReady = false;
    return false;
  }
}

async function loadVisitRow(
  executor: DbExecutor,
  tableLetter: string,
): Promise<TableVisitRow | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT table_number, is_open, session_generation
     FROM ${VISITS_TABLE} WHERE table_number = ? LIMIT 1`,
    [table],
  );
  return visitRowToState(rows[0], table);
}

async function loadActiveSessionRow(
  executor: DbExecutor,
  tableLetter: string,
  options?: { includeStale?: boolean },
): Promise<ActiveQrSessionRow | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  const liveOnly = !options?.includeStale;
  const liveSql = liveOnly
    ? ` AND expires_at > NOW() AND ${idleSessionSqlClause()}`
    : "";

  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT session_id, device_id, session_generation, expires_at, started_at, updated_at
     FROM ${ACTIVE_TABLE} WHERE table_number = ?${liveSql} LIMIT 1`,
    [table],
  );
  return activeRowToState(rows[0]);
}

async function activeSessionRowIsStale(
  executor: DbExecutor,
  tableLetter: string,
): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return false;

  const [rows] = await executor.query<RowDataPacket[]>(
    `SELECT 1 FROM ${ACTIVE_TABLE}
     WHERE table_number = ?
       AND (expires_at <= NOW() OR NOT (${idleSessionSqlClause()}))
     LIMIT 1`,
    [table],
  );
  return rows.length > 0;
}

async function loadTableSessionState(
  executor: DbExecutor,
  tableLetter: string,
): Promise<TableSessionState | null> {
  const visit = await loadVisitRow(executor, tableLetter);
  if (!visit) return null;
  const active = await loadActiveSessionRow(executor, tableLetter);
  return mergeState(visit, active);
}

async function archiveAndClearActiveSession(
  executor: DbExecutor,
  tableLetter: string,
  reason: SessionEndReason,
  onlySessionId?: string | null,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return;

  const active = await loadActiveSessionRow(executor, table, { includeStale: true });
  if (!active) return;
  if (onlySessionId && active.sessionId !== onlySessionId) return;

  const params = onlySessionId
    ? [table, active.sessionId]
    : [table];
  const deleteSql = onlySessionId
    ? `DELETE FROM ${ACTIVE_TABLE} WHERE table_number = ? AND session_id = ?`
    : `DELETE FROM ${ACTIVE_TABLE} WHERE table_number = ?`;

  const [deleteResult] = await executor.query<ResultSetHeader>(deleteSql, params);
  if (deleteResult.affectedRows === 0) return;

  const now = mysqlNow();
  await executor.query(
    `INSERT INTO ${ENDED_TABLE}
       (table_number, session_id, device_id, session_generation, end_reason, started_at, ended_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      table,
      active.sessionId,
      active.deviceId,
      active.sessionGeneration,
      reason,
      active.startedAt,
      now,
    ],
  );
}

async function upsertActiveSession(
  executor: DbExecutor,
  tableLetter: string,
  sessionId: string,
  deviceId: string,
  sessionGeneration: number,
  expiresAt: Date,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return;

  await executor.query(
    `INSERT INTO ${ACTIVE_TABLE}
       (table_number, session_id, device_id, session_generation, expires_at, started_at, updated_at)
     VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     ON DUPLICATE KEY UPDATE
       session_id = VALUES(session_id),
       device_id = VALUES(device_id),
       session_generation = VALUES(session_generation),
       expires_at = VALUES(expires_at),
       updated_at = CURRENT_TIMESTAMP`,
    [table, sessionId, deviceId, sessionGeneration, expiresAt],
  );
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
  state: TableSessionState,
  hasOrders: boolean,
  requesterHasCurrentSession: boolean,
): TableVisitStatus {
  const visitOpen = state.isOpen;
  const hasActiveSession = hasLiveDevice(state);
  const vacant = !hasOrders && !hasActiveSession;
  const canBind = visitOpen && (vacant || requesterHasCurrentSession);

  return {
    tableLetter: state.tableLetter,
    visitOpen,
    hasActiveOrders: hasOrders,
    canBind,
  };
}

async function loadTableSessionStateForTable(
  tableLetter: string,
): Promise<TableSessionState | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return null;
  if (!(await ensureQrSessionSchema())) {
    return mergeState(visitRowToState(undefined, table), null);
  }

  try {
    const pool = getPool();
    const state = await loadTableSessionState(pool, table);
    if (state) return state;

    return mergeState(visitRowToState(undefined, table), null);
  } catch {
    return mergeState(visitRowToState(undefined, table), null);
  }
}

async function clearStaleActiveSession(tableLetter: string): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return;
  if (!(await ensureQrSessionSchema())) return;

  const pool = getPool();
  const visit = await loadVisitRow(pool, table);
  const active = await loadActiveSessionRow(pool, table, { includeStale: true });

  if (
    visit &&
    active &&
    active.sessionGeneration !== visit.sessionGeneration
  ) {
    await archiveAndClearActiveSession(pool, table, "new_guests");
    return;
  }

  const stale = await activeSessionRowIsStale(pool, table);
  if (!stale) return;
  await archiveAndClearActiveSession(pool, table, "expired");
}

export async function getTableVisitStatus(
  tableLetter: string,
  requesterHasCurrentSession = false,
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

  let state = await loadTableSessionStateForTable(table);
  if (!state) {
    state = mergeState(visitRowToState(undefined, table), null);
  }

  await clearStaleActiveSession(table);
  state = (await loadTableSessionStateForTable(table)) ?? state;

  if (state.activeSessionId && sessionExpired(state.sessionExpiresAt)) {
    await clearStaleActiveSession(table);
    state = {
      ...state,
      activeSessionId: null,
      activeDeviceId: null,
      sessionExpiresAt: null,
      sessionUpdatedAt: null,
    };
  }

  const hasOrders = await hasActiveOrders(table);
  return buildStatus(state, hasOrders, requesterHasCurrentSession);
}

export async function getTableSessionSummary(
  tableLetter: string,
): Promise<TableSessionSummary | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  const status = await getTableVisitStatus(table);
  if (!status) {
    return {
      tableLetter: table,
      visitOpen: false,
      hasActiveOrders: false,
      canBind: false,
      sessionOccupied: false,
    };
  }

  const state = await loadTableSessionStateForTable(status.tableLetter);
  return {
    ...status,
    sessionOccupied: state ? hasLiveDevice(state) : false,
  };
}

export async function resolveTableVisitBinding(
  request: Request | null,
  tableLetter: string,
): Promise<TableVisitStatus | null> {
  const requesterActive =
    request != null && (await requesterHasTableGuestSession(request, tableLetter));
  return getTableVisitStatus(tableLetter, requesterActive);
}

async function requesterHasTableGuestSession(
  request: Request,
  tableLetter: string,
): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return false;
  const payload = guestSessionTokenFromRequest(request);
  const record = await validateGuestSessionPayload(payload);
  return record != null && record.tableLetter === table;
}

async function resolveDeviceTableSession(
  deviceId: string,
  table: string,
): Promise<TableSessionRecord | null> {
  if (!(await ensureQrSessionSchema())) return null;

  const pool = getPool();
  const visit = await loadVisitRow(pool, table);
  if (!visit || !visit.isOpen) return null;

  const active = await loadActiveSessionRow(pool, table);
  if (!active || !hasLiveDevice(mergeState(visit, active))) return null;
  if (active.deviceId !== deviceId) return null;
  if (active.sessionGeneration !== visit.sessionGeneration) return null;

  return {
    sessionId: active.sessionId,
    tableLetter: table,
    sessionGeneration: visit.sessionGeneration,
  };
}

async function findActiveDeviceSession(
  deviceId: string,
): Promise<TableSessionRecord | null> {
  if (!isDatabaseConfigured()) return null;
  if (!(await ensureQrSessionSchema())) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT q.table_number, q.session_id, q.session_generation, q.expires_at,
              v.is_open, v.session_generation AS visit_generation
       FROM ${ACTIVE_TABLE} q
       INNER JOIN ${VISITS_TABLE} v ON v.table_number = q.table_number
       WHERE q.device_id = ? AND v.is_open = 1
         AND q.expires_at > NOW() AND ${idleSessionSqlClause("q.updated_at")}
       LIMIT 1`,
      [deviceId],
    );
    if (!rows[0]) return null;

    const table = normalizeTableLetter(String(rows[0].table_number));
    if (!table) return null;

    const visitGeneration = Number(rows[0].visit_generation ?? 0);
    const sessionGeneration = Number(rows[0].session_generation ?? 0);
    if (visitGeneration !== sessionGeneration) return null;

    return {
      sessionId: String(rows[0].session_id),
      tableLetter: table,
      sessionGeneration: visitGeneration,
    };
  } catch {
    return null;
  }
}

export async function resolveGuestSessionFromRequest(
  request: Request,
  options?: { tableLetter?: string | null },
): Promise<TableSessionRecord | null> {
  const payload = guestSessionTokenFromRequest(request);
  const fromToken = await validateGuestSessionPayload(payload);
  if (fromToken) return fromToken;

  const deviceId = guestDeviceIdFromRequest(request);
  if (!deviceId) return null;

  const tableHint =
    normalizeTableLetter(options?.tableLetter) ??
    normalizeTableLetter(payload?.table);
  if (tableHint) {
    return resolveDeviceTableSession(deviceId, tableHint);
  }

  return findActiveDeviceSession(deviceId);
}

async function validateGuestSessionPayload(
  payload: GuestSessionPayload | null,
): Promise<TableSessionRecord | null> {
  if (!payload) return null;

  const table = normalizeTableLetter(payload.table);
  const deviceId = normalizeGuestDeviceId(payload.did);
  if (!table || !deviceId || !isDatabaseConfigured()) return null;
  if (!(await ensureQrSessionSchema())) return null;

  await clearStaleActiveSession(table);

  const pool = getPool();
  const visit = await loadVisitRow(pool, table);
  if (!visit || !visit.isOpen) return null;
  if (visit.sessionGeneration !== Number(payload.gen)) return null;

  const active = await loadActiveSessionRow(pool, table);
  if (!active || active.sessionId !== payload.sid) return null;
  if (active.deviceId !== deviceId) return null;

  return {
    sessionId: payload.sid,
    tableLetter: table,
    sessionGeneration: visit.sessionGeneration,
  };
}

/** Admin completes order — close table and revoke all device access. */
async function closeTableSession(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;
  if (!(await ensureQrSessionSchema())) return false;

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const now = mysqlNow();

    await archiveAndClearActiveSession(connection, table, "table_closed");

    await connection.query(
      `INSERT INTO ${VISITS_TABLE}
         (table_number, is_open, session_generation, opened_at, closed_at, updated_at)
       VALUES (?, 0, 0, NULL, ?, ?)
       ON DUPLICATE KEY UPDATE
         is_open = 0,
         closed_at = VALUES(closed_at),
         updated_at = VALUES(updated_at)`,
      [table, now, now],
    );

    await connection.commit();
    return true;
  } catch {
    await connection.rollback();
    return false;
  } finally {
    connection.release();
  }
}

export async function closeTableSessionIfNoActiveOrders(
  tableLetter: string,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return;
  if (await hasActiveOrders(table)) return;
  await closeTableSession(table);
}

/** Admin opens table for the next party — new generation, no active device. */
export async function openTableForNewGuests(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) return false;
  if (!(await ensureQrSessionSchema())) return false;
  if (await hasActiveOrders(table)) return false;

  const pool = getPool();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    const now = mysqlNow();

    await archiveAndClearActiveSession(connection, table, "new_guests");

    await connection.query(
      `INSERT INTO ${VISITS_TABLE}
         (table_number, is_open, session_generation, opened_at, closed_at, updated_at)
       VALUES (?, 1, 1, ?, NULL, ?)
       ON DUPLICATE KEY UPDATE
         is_open = 1,
         session_generation = session_generation + 1,
         opened_at = VALUES(opened_at),
         closed_at = NULL,
         updated_at = VALUES(updated_at)`,
      [table, now, now],
    );

    await connection.commit();
    return true;
  } catch {
    await connection.rollback();
    return false;
  } finally {
    connection.release();
  }
}

/** Claim or refresh the single active device slot for this table (QR scan). */
async function commitClaimedSession(
  connection: PoolConnection,
  table: string,
  sessionId: string,
  deviceId: string,
  sessionGeneration: number,
): Promise<Extract<TableSessionIssueResult, { ok: true }>> {
  const exp = Date.now() + GUEST_SESSION_MAX_AGE_SEC * 1000;
  await upsertActiveSession(
    connection,
    table,
    sessionId,
    deviceId,
    sessionGeneration,
    new Date(exp),
  );
  await connection.commit();

  const payload: GuestSessionPayload = {
    sid: sessionId,
    table,
    did: deviceId,
    gen: sessionGeneration,
    exp,
  };
  return {
    ok: true,
    token: createGuestSessionToken(payload),
    payload,
    deviceId,
  };
}

export async function claimTableSessionOnScan(
  request: Request,
  tableLetter: string,
): Promise<TableSessionIssueResult> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isDatabaseConfigured()) {
    return { ok: false, code: "db_unavailable" };
  }
  if (!(await ensureQrSessionSchema())) {
    return {
      ok: false,
      code: "db_unavailable",
      detail: "QR session tables are missing or could not be initialized.",
    };
  }

  const pool = getPool();
  let connection: PoolConnection | null = null;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [visitRows] = await connection.query<RowDataPacket[]>(
      `SELECT table_number, is_open, session_generation
       FROM ${VISITS_TABLE} WHERE table_number = ? FOR UPDATE`,
      [table],
    );

    if (!visitRows[0]) {
      await connection.rollback();
      return { ok: false, code: "visit_closed" };
    }

    const visit = visitRowToState(visitRows[0], table);
    if (!visit.isOpen) {
      await connection.rollback();
      return { ok: false, code: "visit_closed" };
    }

    const [activeRows] = await connection.query<RowDataPacket[]>(
      `SELECT session_id, device_id, session_generation, expires_at, started_at, updated_at
       FROM ${ACTIVE_TABLE} WHERE table_number = ? FOR UPDATE`,
      [table],
    );
    let active = activeRowToState(activeRows[0]);

    if (active && active.sessionGeneration !== visit.sessionGeneration) {
      await archiveAndClearActiveSession(connection, table, "new_guests");
      active = null;
    }

    if (active && (await activeSessionRowIsStale(connection, table))) {
      await archiveAndClearActiveSession(connection, table, "expired");
      active = null;
    }

    const state = mergeState(visit, active);

    const requesterPayload = guestSessionTokenFromRequest(request);
    const deviceIdFromCookie = guestDeviceIdFromRequest(request);
    const deviceIdFromSession = normalizeGuestDeviceId(requesterPayload?.did);
    const requesterDeviceId = deviceIdFromCookie ?? deviceIdFromSession;

    const requesterMatchesSession =
      requesterPayload != null &&
      normalizeTableLetter(requesterPayload.table) === table &&
      Number(requesterPayload.gen) === visit.sessionGeneration &&
      state.activeSessionId != null &&
      requesterPayload.sid === state.activeSessionId;

    const hasActiveSession = hasLiveDevice(state);
    const tableHasOrders = await hasActiveOrders(table);

    if (hasActiveSession || tableHasOrders) {
      if (requesterMatchesSession) {
        const activeDeviceId =
          state.activeDeviceId ?? requesterDeviceId ?? generateGuestDeviceId();
        const sessionId = state.activeSessionId ?? generateGuestSessionId();
        return commitClaimedSession(
          connection,
          table,
          sessionId,
          activeDeviceId,
          visit.sessionGeneration,
        );
      }

      await connection.rollback();
      return { ok: false, code: "session_locked" };
    }

    return commitClaimedSession(
      connection,
      table,
      generateGuestSessionId(),
      requesterDeviceId ?? generateGuestDeviceId(),
      visit.sessionGeneration,
    );
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        /* ignore */
      }
    }
    const detail = err instanceof Error ? err.message : String(err);
    if (process.env.NODE_ENV === "development") {
      console.error("[claimTableSessionOnScan]", table, detail);
    }
    return { ok: false, code: "db_unavailable", detail };
  } finally {
    connection?.release();
  }
}

/** Release this device's slot without closing the table (client sign-out). */
export async function releaseTableSessionIfMatches(
  tableLetter: string,
  sessionId: string | null,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !sessionId || !isDatabaseConfigured()) return;
  if (!(await ensureQrSessionSchema())) return;

  try {
    const pool = getPool();
    await archiveAndClearActiveSession(pool, table, "released", sessionId);
  } catch {
    /* ignore */
  }
}

/** Record guest activity so idle timeout resets (does not extend absolute max age). */
export async function touchGuestSessionActivity(
  request: Request,
): Promise<boolean> {
  const record = await resolveGuestSessionFromRequest(request);
  if (!record || !isDatabaseConfigured()) return false;
  if (!(await ensureQrSessionSchema())) return false;

  const table = record.tableLetter;
  const pool = getPool();

  try {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE ${ACTIVE_TABLE}
       SET updated_at = CURRENT_TIMESTAMP
       WHERE table_number = ? AND session_id = ?
         AND expires_at > NOW() AND ${idleSessionSqlClause()}`,
      [table, record.sessionId],
    );
    return result.affectedRows > 0;
  } catch {
    return false;
  }
}
