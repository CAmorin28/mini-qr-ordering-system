import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { createGuestSessionForTable } from "@/lib/db/guest-sessions";
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from "@/lib/guest-session-token";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import type { TableVisitStatus } from "@/lib/db/table-visits";

/** Attach a device-bound httpOnly session cookie after a successful QR scan. */
export async function jsonWithGuestSessionCookie(
  request: Request,
  tableLetter: string,
  body: TableVisitStatus & { databaseConfigured?: boolean },
  issueSession: boolean,
): Promise<NextResponse> {
  const response = NextResponse.json(body);

  if (
    !issueSession ||
    !body.canBind ||
    !isGuestQrSecurityEnabled(request.headers.get("host")) ||
    !isDatabaseConfigured()
  ) {
    return response;
  }

  const session = await createGuestSessionForTable(tableLetter);
  if (session) {
    response.cookies.set(GUEST_SESSION_COOKIE, session.token, guestSessionCookieOptions());
  }

  return response;
}
