import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { claimTableSessionOnScan, resolveTableVisitBinding } from "@/lib/db/table-qr-session";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import { GUEST_SESSION_COOKIE, guestSessionCookieOptions } from "@/lib/guest-session-token";
import { normalizeTableLetter } from "@/lib/table-session";

const ACTIVE_ORDERS_MESSAGE =
  "This table already has an order in progress. Please wait until staff complete the current visit.";

const TABLE_SESSION_ACTIVE_MESSAGE =
  "This table is already in use on another device. Only one device may order at this table.";

const VISIT_CLOSED_MESSAGE =
  "This table is not open for new guests yet. Ask staff to tap Open table for new guests.";

/** GET /api/table-visit?table=A — table lock state from MySQL */
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

  const status = await resolveTableVisitBinding(request, tableLetter);
  if (!status) {
    return NextResponse.json({ error: "Failed to load table session" }, { status: 500 });
  }

  return NextResponse.json({ ...status, databaseConfigured: true });
}

/** POST /api/table-visit — claim the single device slot after QR scan */
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

  const before = await resolveTableVisitBinding(request, tableLetter);
  if (!before) {
    return NextResponse.json({ error: "Failed to load table session" }, { status: 500 });
  }

  if (before.hasActiveOrders && !before.canBind) {
    return NextResponse.json(
      {
        ...before,
        databaseConfigured: true,
        canBind: false,
        code: "active_orders",
        error: ACTIVE_ORDERS_MESSAGE,
      },
      { status: 403 },
    );
  }

  const claimed = await claimTableSessionOnScan(request, tableLetter);
  if (!claimed.ok) {
    const code =
      claimed.code === "session_locked"
        ? "session_locked"
        : claimed.code === "visit_closed"
          ? "visit_closed"
          : "db_unavailable";

    return NextResponse.json(
      {
        ...before,
        databaseConfigured: true,
        canBind: false,
        code,
        error:
          code === "session_locked"
            ? TABLE_SESSION_ACTIVE_MESSAGE
            : code === "visit_closed"
              ? VISIT_CLOSED_MESSAGE
              : "Could not start table session. Run database/schema.sql.",
      },
      { status: code === "db_unavailable" ? 503 : 403 },
    );
  }

  const response = NextResponse.json({
    ...before,
    visitOpen: true,
    canBind: true,
    databaseConfigured: true,
  });

  if (isGuestQrSecurityEnabled(request.headers.get("host"))) {
    const xfProto = request.headers.get("x-forwarded-proto");
    const secure =
      xfProto != null ? xfProto.toLowerCase().includes("https") : process.env.NODE_ENV === "production";
    response.cookies.set(GUEST_SESSION_COOKIE, claimed.token, guestSessionCookieOptions({ secure }));
  }

  return response;
}
