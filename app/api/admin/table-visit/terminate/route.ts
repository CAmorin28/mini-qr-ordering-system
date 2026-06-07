import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/admin-api-route";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  getTableSessionSummary,
  terminateActiveTableSession,
} from "@/lib/db/table-qr-session";
import { normalizeTableLetter } from "@/lib/shared/table-session";

/** POST /api/admin/table-visit/terminate — force-end the active QR device session */
export async function POST(request: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const tableLetter = normalizeTableLetter(
    body && typeof body === "object" && "table" in body
      ? String((body as { table: unknown }).table)
      : "",
  );

  if (!tableLetter) {
    return NextResponse.json({ error: "Invalid table letter" }, { status: 400 });
  }

  const terminated = await terminateActiveTableSession(tableLetter);
  if (!terminated) {
    return NextResponse.json(
      {
        error: "Could not terminate table session. Re-run database/schema.sql in MySQL Workbench.",
      },
      { status: 503 },
    );
  }

  const summary = await getTableSessionSummary(tableLetter);
  if (!summary) {
    return NextResponse.json(
      {
        error:
          "Table session could not be read from the database. Check MySQL is running and re-run database/schema.sql if needed.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(summary);
}
