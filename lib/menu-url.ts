import { fetchGuestSessionStatus } from "@/lib/api-guest-session";
import { isGuestQrSecurityEnabledClient } from "@/lib/guest-qr-security";
import {
  normalizeTableLetter,
  resolveTerminatedTableLetter,
} from "@/lib/table-session";
export const MENU_PAGE_PATH = "/menu" as const;

/** QR scan entry — opens server visit, then redirects to /menu?table= */
export const TABLE_ENTER_PAGE_PATH = "/menu/enter" as const;

export const CHECKOUT_PAGE_PATH = "/checkout" as const;
export const CHECKOUT_REVIEW_PATH = "/checkout/review" as const;
export const ORDERS_HISTORY_PATH = "/orders" as const;

export const ADMIN_LOGIN_PATH = "/admin/login" as const;
export const ADMIN_DASHBOARD_PATH = "/admin" as const;

export function checkoutConfirmationPath(orderId: string): string {
  return `/checkout/confirmation/${encodeURIComponent(orderId)}`;
}

/** Staff QR generator (not subject to guest /qr → /menu redirect). */
export const STAFF_QR_PAGE_PATH = "/admin/qr" as const;

export function staffQrPath(tableLetter?: string): string {
  const params = new URLSearchParams();
  const table = normalizeTableLetter(tableLetter);
  if (table) params.set("table", table);
  const query = params.toString();
  return query ? `${STAFF_QR_PAGE_PATH}?${query}` : STAFF_QR_PAGE_PATH;
}

/** Build the absolute menu URL from a site origin (optional table letter query param). */
export function menuUrlFromOrigin(origin: string, tableLetter?: string): string {
  const table = normalizeTableLetter(tableLetter);
  const path = table ? TABLE_ENTER_PAGE_PATH : MENU_PAGE_PATH;
  const url = new URL(path, origin);
  if (table) {
    url.searchParams.set("table", table);
  }
  return url.href;
}

/** Build the scannable menu URL for a table letter using the resolved site origin. */
export function menuUrlForTable(tableLetter: string, scannableOrigin: string): string {
  const table = normalizeTableLetter(tableLetter);
  if (!table) {
    return scannableOrigin;
  }
  return menuUrlFromOrigin(scannableOrigin, table);
}

/** Read table letter from menu page search params. */
export function tableLetterFromSearch(search: string): string {
  if (!search) return "";
  const value = new URLSearchParams(search).get("table");
  return normalizeTableLetter(value);
}

/** Remove ?table= from a path (e.g. after visit ends). */
export function pathWithoutTable(path: string): string {
  const [pathname, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.delete("table");
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function resolvedTableHint(
  ...hints: (string | null | undefined)[]
): string {
  return hints.map((hint) => normalizeTableLetter(hint)).find(Boolean) ?? "";
}

/** Menu href for in-app navigation; terminated sessions go to the enter page. */
export function customerMenuNavHref(
  ...hints: (string | null | undefined)[]
): string {
  const endedTable = resolveTerminatedTableLetter(...hints);
  if (endedTable) {
    return pathWithTable(TABLE_ENTER_PAGE_PATH, endedTable);
  }
  const table = resolvedTableHint(...hints);
  return table ? pathWithTable(MENU_PAGE_PATH, table) : MENU_PAGE_PATH;
}

/** Full-page redirect when the table visit was terminated (e.g. header back). */
export function redirectTerminatedTableNav(
  ...hints: (string | null | undefined)[]
): boolean {
  if (typeof window === "undefined") return false;
  const endedTable = resolveTerminatedTableLetter(...hints);
  if (!endedTable) return false;
  window.location.replace(pathWithTable(TABLE_ENTER_PAGE_PATH, endedTable));
  return true;
}

/**
 * Header back / return-to-menu: honor terminated visits and dead server sessions.
 * Always performs a full-page navigation so guards cannot be skipped by SPA routing.
 */
export async function navigateCustomerMenuBack(
  ...hints: (string | null | undefined)[]
): Promise<void> {
  if (typeof window === "undefined") return;

  const urlTable = tableLetterFromSearch(window.location.search);
  const allHints = [...hints, urlTable];

  if (redirectTerminatedTableNav(...allHints)) return;

  const table = resolvedTableHint(...allHints);
  if (table && isGuestQrSecurityEnabledClient()) {
    try {
      const guest = await fetchGuestSessionStatus(table);
      if (guest?.enforced !== false && guest?.valid !== true) {
        window.location.replace(pathWithTable(TABLE_ENTER_PAGE_PATH, table));
        return;
      }
    } catch {
      window.location.replace(pathWithTable(TABLE_ENTER_PAGE_PATH, table));
      return;
    }
  }

  window.location.assign(customerMenuNavHref(...allHints));
}

/** Append ?table=X to an app path when a table session is active. */
export function pathWithTable(path: string, tableLetter: string): string {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return path;
  const [pathname, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set("table", table);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

/** @deprecated Use menuUrlForTable with scannableOrigin from the server. */
export function menuUrlFromWindow(
  tableLetter?: string,
  scannableOrigin?: string | null,
): string | null {
  if (typeof window === "undefined" || !scannableOrigin) return null;
  const table =
    normalizeTableLetter(tableLetter) ||
    tableLetterFromSearch(window.location.search);
  return menuUrlFromOrigin(scannableOrigin, table || undefined);
}

/** @deprecated Use tableLetterFromSearch */
export function tableNumberFromSearch(search: string): string {
  return tableLetterFromSearch(search);
}
