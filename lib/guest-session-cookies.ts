import "server-only";

import { cookies } from "next/headers";
import {
  GUEST_SESSION_COOKIE,
  verifyGuestSessionToken,
  type GuestSessionPayload,
} from "@/lib/guest-session-token";

export async function getGuestSessionPayloadFromCookies(): Promise<GuestSessionPayload | null> {
  const store = await cookies();
  return verifyGuestSessionToken(store.get(GUEST_SESSION_COOKIE)?.value);
}

export async function clearGuestSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_SESSION_COOKIE);
}
