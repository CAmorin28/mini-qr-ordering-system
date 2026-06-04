import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-route";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getTableVisitStatus, openTableVisit } from "@/lib/supabase/table-visits";
import { normalizeTableLetter } from "@/lib/table-session";

/** POST /api/admin/table-visit — open table for the next party after a visit was completed */
export async function POST(request: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  if (!isSupabaseConfigured()) {
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

  return NextResponse.json(status);
}
