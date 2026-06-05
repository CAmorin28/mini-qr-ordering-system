import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { resolveGuestSessionFromServerCookies } from "@/lib/guest-session-cookies";
import { resolveGuestSessionFromRequest } from "@/lib/db/table-qr-session";
import { isGuestQrSecurityEnabled } from "@/lib/guest-qr-security";
import {
  MENU_PAGE_PATH,
  TABLE_ENTER_PAGE_PATH,
  pathWithTable,
} from "@/lib/menu-url";
import { normalizeTableLetter } from "@/lib/table-session";

/** Server page guard — redirects when QR session is missing or invalid. */
export async function enforceGuestQrAccess(options?: {
  tableLetter?: string | null;
  /** Redirect to the QR entry page when there is no session (checkout/orders/menu). */
  redirectIfMissing?: boolean;
  /** When true, /menu without ?table= redirects to /menu?table={session}. */
  bindTableToMenuUrl?: boolean;
}): Promise<{ tableLetter: string } | null> {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!isGuestQrSecurityEnabled(host)) return null;

  const urlTable = normalizeTableLetter(options?.tableLetter);
  const record = await resolveGuestSessionFromServerCookies({ tableLetter: urlTable });
  if (!record) {
    if (urlTable) {
      redirect(pathWithTable(TABLE_ENTER_PAGE_PATH, urlTable));
    }
    if (options?.redirectIfMissing) {
      redirect(TABLE_ENTER_PAGE_PATH);
    }
    redirect(TABLE_ENTER_PAGE_PATH);
  }

  if (urlTable && urlTable !== record.tableLetter) {
    redirect(pathWithTable(TABLE_ENTER_PAGE_PATH, urlTable));
  }

  if (!urlTable) {
    if (options?.bindTableToMenuUrl) {
      redirect(pathWithTable(MENU_PAGE_PATH, record.tableLetter));
    }
    return { tableLetter: record.tableLetter };
  }

  return { tableLetter: record.tableLetter };
}

/** API route guard — returns 401/403 when session is invalid. */
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

  const table = normalizeTableLetter(expectedTable);
  const record = await resolveGuestSessionFromRequest(request, { tableLetter: table });

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
