import { NextResponse } from "next/server";
import { clearGuestSessionCookie, getGuestSessionPayloadFromCookies } from "@/lib/guest-session-cookies";
import {
  releaseTableSessionIfMatches,
  resolveGuestSessionFromRequest,
  touchGuestSessionActivity,
} from "@/lib/db/table-qr-session";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import {
  GUEST_SESSION_CACHE_HEADERS,
  guestCookiesSecureFromRequest,
} from "@/lib/guest-cookie-request";
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from "@/lib/guest-session-token";
import { formatTableLabel, normalizeTableLetter } from "@/lib/table-session";

/** GET /api/guest-session — validate device + table session (MySQL is source of truth). */
export async function GET(request: Request) {
  const host = request.headers.get("host");
  if (!isGuestQrSecurityEnabled(host)) {
    return NextResponse.json(
      {
        enforced: false,
        valid: true,
        tableLetter: "",
      },
      { headers: GUEST_SESSION_CACHE_HEADERS },
    );
  }

  const { searchParams } = new URL(request.url);
  const tableHint = normalizeTableLetter(searchParams.get("table"));
  const record = await resolveGuestSessionFromRequest(request, {
    tableLetter: tableHint,
  });

  if (!record) {
    const payload = await getGuestSessionPayloadFromCookies();
    return NextResponse.json(
      {
        enforced: true,
        valid: false,
        tableLetter: "",
        code: payload ? "invalid_session" : "no_session",
      },
      { status: 401, headers: GUEST_SESSION_CACHE_HEADERS },
    );
  }

  if (tableHint && tableHint !== record.tableLetter) {
    return NextResponse.json(
      {
        enforced: true,
        valid: false,
        tableLetter: record.tableLetter,
        tableLabel: formatTableLabel(record.tableLetter),
        code: "guest_table_mismatch",
      },
      { status: 403, headers: GUEST_SESSION_CACHE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      enforced: true,
      valid: true,
      tableLetter: record.tableLetter,
      tableLabel: formatTableLabel(record.tableLetter),
    },
    { headers: GUEST_SESSION_CACHE_HEADERS },
  );
}

/** PATCH /api/guest-session — reset idle timeout while the guest is active */
export async function PATCH(request: Request) {
  const host = request.headers.get("host");
  if (!isGuestQrSecurityEnabled(host)) {
    return NextResponse.json({ touched: true }, { headers: GUEST_SESSION_CACHE_HEADERS });
  }

  const touched = await touchGuestSessionActivity(request);
  if (!touched) {
    return NextResponse.json(
      { error: "No active table session", code: "no_session" },
      { status: 401, headers: GUEST_SESSION_CACHE_HEADERS },
    );
  }

  return NextResponse.json({ touched: true }, { headers: GUEST_SESSION_CACHE_HEADERS });
}

/** DELETE /api/guest-session — release slot and/or clear the cookie */
export async function DELETE(request: Request) {
  const host = request.headers.get("host");
  const cookieOnly = new URL(request.url).searchParams.get("cookieOnly") === "1";
  const record = await resolveGuestSessionFromRequest(request);
  const payload = await getGuestSessionPayloadFromCookies();
  const tableLetter =
    record?.tableLetter ?? normalizeTableLetter(payload?.table ?? "");

  if (!cookieOnly && record?.sessionId && tableLetter) {
    await releaseTableSessionIfMatches(tableLetter, record.sessionId);
  }
  await clearGuestSessionCookie();

  const secure = guestCookiesSecureFromRequest(request);
  const response = NextResponse.json(
    {
      cleared: true,
      tableLetter: record?.tableLetter ?? payload?.table ?? "",
    },
    { headers: GUEST_SESSION_CACHE_HEADERS },
  );

  response.cookies.set(GUEST_SESSION_COOKIE, "", {
    ...guestSessionCookieOptions({ secure }),
    maxAge: 0,
  });

  if (!isGuestQrSecurityEnabled(host)) {
    return response;
  }

  return response;
}
