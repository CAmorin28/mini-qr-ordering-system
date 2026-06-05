import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  getTableVisitStatus,
  openTableVisit,
} from "@/lib/db/table-visits";
import { jsonWithGuestSessionCookie } from "@/lib/guest-session-response";
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

  if (!isDatabaseConfigured()) {
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

  if (!isDatabaseConfigured()) {
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
    return jsonWithGuestSessionCookie(
      request,
      tableLetter,
      { ...before, databaseConfigured: true },
      true,
    );
  }

  if (before.hasActiveOrders) {
    return jsonWithGuestSessionCookie(
      request,
      tableLetter,
      { ...before, databaseConfigured: true },
      before.canBind,
    );
  }

  const opened = await openTableVisit(tableLetter);
  if (!opened) {
    return NextResponse.json(
      {
        error: "Could not open table visit. Check MySQL table_visits setup.",
      },
      { status: 503 },
    );
  }

  const status = await getTableVisitStatus(tableLetter);
  if (!status) {
    return NextResponse.json({ error: "Failed to load table visit" }, { status: 500 });
  }

  return jsonWithGuestSessionCookie(
    request,
    tableLetter,
    { ...status, databaseConfigured: true },
    status.canBind,
  );
}
