import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-route";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  getTableVisitStatus,
  openTableForNewGuests,
} from "@/lib/db/table-qr-session";
import { normalizeTableLetter } from "@/lib/table-session";

/** POST /api/admin/table-visit — reset table and open for the next party */
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

  const before = await getTableVisitStatus(tableLetter);
  if (before?.hasActiveOrders) {
    return NextResponse.json(
      {
        error:
          "This table still has an active order. Complete or cancel it before opening for new guests.",
      },
      { status: 409 },
    );
  }

  const opened = await openTableForNewGuests(tableLetter);
  if (!opened) {
    return NextResponse.json(
      {
        error: "Could not open table. Re-run database/schema.sql in MySQL Workbench.",
      },
      { status: 503 },
    );
  }

  const status = await getTableVisitStatus(tableLetter);
  if (!status) {
    return NextResponse.json({ error: "Failed to load table session" }, { status: 500 });
  }

  return NextResponse.json(status);
}
