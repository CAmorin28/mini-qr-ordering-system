import { normalizeTableLetter } from "@/lib/table-session";
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
