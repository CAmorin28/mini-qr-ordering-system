import type { NextResponse } from "next/server";
import {
  GUEST_DEVICE_COOKIE,
  guestDeviceCookieOptions,
} from "@/lib/server/guest-device-id";
import { guestCookiesSecureFromRequest } from "@/lib/server/guest-cookie-request";
import {
  GUEST_SESSION_COOKIE,
  guestSessionCookieOptions,
} from "@/lib/server/guest-session-token";

/** Set signed session + stable device cookies after a successful QR claim. */
export function applyGuestSessionCookies(
  response: NextResponse,
  request: Request,
  tokens: { sessionToken: string; deviceId: string },
): void {
  const secure = guestCookiesSecureFromRequest(request);
  response.cookies.set(
    GUEST_SESSION_COOKIE,
    tokens.sessionToken,
    guestSessionCookieOptions({ secure }),
  );
  response.cookies.set(
    GUEST_DEVICE_COOKIE,
    tokens.deviceId,
    guestDeviceCookieOptions({ secure }),
  );
}
