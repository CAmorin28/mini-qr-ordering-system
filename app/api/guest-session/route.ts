import { NextResponse } from "next/server";
import { clearGuestSessionCookie, getGuestSessionPayloadFromCookies } from "@/lib/guest-session-cookies";
import { validateGuestSessionPayload } from "@/lib/db/guest-sessions";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from "@/lib/guest-session-token";
import { formatTableLabel } from "@/lib/table-session";

/** GET /api/guest-session — validate device-bound table session (production). */
export async function GET(request: Request) {
  const host = request.headers.get("host");
  if (!isGuestQrSecurityEnabled(host)) {
    return NextResponse.json({
      enforced: false,
      valid: true,
      tableLetter: "",
    });
  }

  const payload = await getGuestSessionPayloadFromCookies();
  const record = await validateGuestSessionPayload(payload);
  if (!record) {
    return NextResponse.json(
      {
        enforced: true,
        valid: false,
        tableLetter: "",
        code: payload ? "invalid_session" : "no_session",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    enforced: true,
    valid: true,
    tableLetter: record.tableLetter,
    tableLabel: formatTableLabel(record.tableLetter),
  });
}

/** DELETE /api/guest-session — clear device session (visit ended or sign-out). */
export async function DELETE(request: Request) {
  const host = request.headers.get("host");
  const payload = await getGuestSessionPayloadFromCookies();
  const record = payload ? await validateGuestSessionPayload(payload) : null;

  await clearGuestSessionCookie();

  const response = NextResponse.json({
    cleared: true,
    tableLetter: record?.tableLetter ?? payload?.table ?? "",
  });
  response.cookies.set(GUEST_SESSION_COOKIE, "", {
    ...guestSessionCookieOptions(),
    maxAge: 0,
  });

  if (!isGuestQrSecurityEnabled(host)) {
    return response;
  }

  return response;
}
