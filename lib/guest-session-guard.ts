import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getGuestSessionPayloadFromCookies } from "@/lib/guest-session-cookies";
import { validateGuestSessionPayload } from "@/lib/db/guest-sessions";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import {
  guestAccessDeniedUrl,
  type GuestAccessDeniedReason,
} from "@/lib/guest-session-paths";
import { guestSessionTokenFromRequest } from "@/lib/guest-session-token";
import { normalizeTableLetter } from "@/lib/table-session";

export type { GuestAccessDeniedReason };
export { GUEST_ACCESS_DENIED_PATH } from "@/lib/guest-session-paths";

/** Server page guard — redirects when QR session is missing or invalid (production only). */
export async function enforceGuestQrAccess(options?: {
  tableLetter?: string | null;
  requireTableInUrl?: boolean;
}): Promise<{ tableLetter: string } | null> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!isGuestQrSecurityEnabled(host)) return null;

  const payload = await getGuestSessionPayloadFromCookies();
  const record = await validateGuestSessionPayload(payload);
  if (!record) {
    const reason: GuestAccessDeniedReason = payload ? "invalid_session" : "no_session";
    redirect(guestAccessDeniedUrl(reason));
  }

  const urlTable = normalizeTableLetter(options?.tableLetter);
  if (options?.requireTableInUrl && !urlTable) {
    redirect(guestAccessDeniedUrl("scan_required"));
  }

  if (urlTable && urlTable !== record.tableLetter) {
    redirect(guestAccessDeniedUrl("table_mismatch"));
  }

  return { tableLetter: record.tableLetter };
}

/** API route guard — returns 401/403 when session is invalid (production only). */
export async function requireGuestSessionForApi(
  request: Request,
  expectedTable?: string | null,
): Promise<
  | { ok: true; tableLetter: string; sessionId: string }
  | { ok: false; response: NextResponse }
> {
  const host = request.headers.get("host");
  if (!isGuestQrSecurityEnabled(host)) {
    const table = normalizeTableLetter(expectedTable);
    return { ok: true, tableLetter: table, sessionId: "" };
  }

  const payload = guestSessionTokenFromRequest(request);
  const record = await validateGuestSessionPayload(payload);

  if (!record) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Table QR session required. Scan the QR code at your table to order — shared links will not work.",
          code: "guest_session_required",
        },
        { status: 401 },
      ),
    };
  }

  const table = normalizeTableLetter(expectedTable);
  if (table && table !== record.tableLetter) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: "This link does not match your table session. Scan the QR at your table.",
          code: "guest_table_mismatch",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, tableLetter: record.tableLetter, sessionId: record.sessionId };
}
