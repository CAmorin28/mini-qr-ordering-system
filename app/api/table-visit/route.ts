import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getTableVisitStatus,
  openTableVisit,
} from "@/lib/supabase/table-visits";
import { normalizeTableLetter } from "@/lib/table-session";

/** GET /api/table-visit?table=A — whether the guest may bind a table session */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tableLetter = normalizeTableLetter(searchParams.get("table"));

  if (!tableLetter) {
    return NextResponse.json(
      { error: "Table required. Pass ?table=A from your QR scan." },
      { status: 400 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      tableLetter,
      visitOpen: true,
      hasActiveOrders: false,
      canBind: true,
      databaseConfigured: false,
    });
  }

  const status = await getTableVisitStatus(tableLetter);
  if (!status) {
    return NextResponse.json({ error: "Failed to load table visit" }, { status: 500 });
  }

  return NextResponse.json({ ...status, databaseConfigured: true });
}

/** POST /api/table-visit — open visit after scanning table QR (/menu/enter) */
export async function POST(request: Request) {
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

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      tableLetter,
      visitOpen: true,
      hasActiveOrders: false,
      canBind: true,
      databaseConfigured: false,
    });
  }

  const before = await getTableVisitStatus(tableLetter);
  if (!before) {
    return NextResponse.json({ error: "Failed to load table visit" }, { status: 500 });
  }

  if (before.canBind && before.visitOpen) {
    return NextResponse.json({ ...before, databaseConfigured: true });
  }

  if (before.hasActiveOrders) {
    return NextResponse.json({ ...before, databaseConfigured: true });
  }

  const opened = await openTableVisit(tableLetter);
  if (!opened) {
    return NextResponse.json(
      {
        error:
          "Could not open table visit. Run supabase/migrate-table-visits.sql in Supabase SQL Editor.",
      },
      { status: 503 },
    );
  }

  const status = await getTableVisitStatus(tableLetter);
  if (!status) {
    return NextResponse.json({ error: "Failed to load table visit" }, { status: 500 });
  }

  return NextResponse.json({ ...status, databaseConfigured: true });
}
