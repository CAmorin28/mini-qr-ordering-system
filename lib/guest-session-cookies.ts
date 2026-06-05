import "server-only";

import { cookies } from "next/headers";
import {
  GUEST_SESSION_COOKIE,
  parseGuestSessionToken,
  type GuestSessionPayload,
} from "@/lib/guest-session-token";
import {
  resolveGuestSessionFromRequest,
  type TableSessionRecord,
} from "@/lib/db/table-qr-session";

export async function getGuestSessionPayloadFromCookies(): Promise<GuestSessionPayload | null> {
  const store = await cookies();
  return parseGuestSessionToken(store.get(GUEST_SESSION_COOKIE)?.value);
}

export async function clearGuestSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_SESSION_COOKIE);
}

function cookieHeaderFromStore(store: Awaited<ReturnType<typeof cookies>>): string {
  return store
    .getAll()
    .map((entry) => `${entry.name}=${entry.value}`)
    .join("; ");
}

/** Resolve device + table session from Next.js request cookies (server components). */
export async function resolveGuestSessionFromServerCookies(options?: {
  tableLetter?: string | null;
}): Promise<TableSessionRecord | null> {
  const store = await cookies();
  const request = new Request("http://session.local/guard", {
    headers: { cookie: cookieHeaderFromStore(store) },
  });
  return resolveGuestSessionFromRequest(request, options);
}
