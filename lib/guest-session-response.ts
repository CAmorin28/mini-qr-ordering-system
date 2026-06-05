import { NextResponse } from "next/server";
import { issueGuestSessionForScan } from "@/lib/db/guest-sessions";
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from "@/lib/guest-session-token";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import type { TableVisitStatus } from "@/lib/db/table-visits";

const SESSION_LOCKED_MESSAGE =
  "This table is already linked to another device. Shared QR links cannot be used — scan at your table with the phone that will order.";

/** Attach a device-bound httpOnly session cookie after a successful QR scan. */
export async function jsonWithGuestSessionCookie(
  request: Request,
  tableLetter: string,
  body: TableVisitStatus & { databaseConfigured?: boolean },
  issueSession: boolean,
): Promise<NextResponse> {
  if (
    !issueSession ||
    !body.canBind ||
    !isGuestQrSecurityEnabled(request.headers.get("host"))
  ) {
    return NextResponse.json(body);
  }

  const issued = await issueGuestSessionForScan(request, tableLetter);
  if (!issued.ok) {
    if (issued.code === "session_locked") {
      return NextResponse.json(
        {
          ...body,
          error: SESSION_LOCKED_MESSAGE,
          code: "session_locked",
        },
        { status: 403 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Could not start a secure table session. Ensure guest_qr_sessions exists in MySQL.",
        code: issued.code,
      },
      { status: 503 },
    );
  }

  const response = NextResponse.json(body);
  response.cookies.set(GUEST_SESSION_COOKIE, issued.token, guestSessionCookieOptions());
  return response;
}
