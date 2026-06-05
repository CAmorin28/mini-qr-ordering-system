import { NextResponse } from "next/server";
import { clearGuestSessionCookie, getGuestSessionPayloadFromCookies } from "@/lib/guest-session-cookies";
import { revokeGuestSession, validateGuestSessionPayload } from "@/lib/db/table-qr-session";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from "@/lib/guest-session-token";
import { formatTableLabel, normalizeTableLetter } from "@/lib/table-session";

/** GET /api/guest-session — validate the single active device slot for this table */
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

/** DELETE /api/guest-session — release this device's slot and clear the cookie */
export async function DELETE(request: Request) {
  const host = request.headers.get("host");
  const payload = await getGuestSessionPayloadFromCookies();
  const record = payload ? await validateGuestSessionPayload(payload) : null;
  const tableLetter =
    record?.tableLetter ?? normalizeTableLetter(payload?.table ?? "");

  if (record?.sessionId && tableLetter) {
    await revokeGuestSession(record.sessionId, tableLetter);
  }
  await clearGuestSessionCookie();

  const response = NextResponse.json({
    cleared: true,
    tableLetter: record?.tableLetter ?? payload?.table ?? "",
  });

  const xfProto = request.headers.get("x-forwarded-proto");
  const secure =
    xfProto != null ? xfProto.toLowerCase().includes("https") : process.env.NODE_ENV === "production";

  response.cookies.set(GUEST_SESSION_COOKIE, "", {
    ...guestSessionCookieOptions({ secure }),
    maxAge: 0,
  });

  if (!isGuestQrSecurityEnabled(host)) {
    return response;
  }

  return response;
}
