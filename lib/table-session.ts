/** Table QR codes use a single letter (A–Z). */
export const TABLE_ID_MAX_LENGTH = 1;

const TABLE_ID_PATTERN = /^[A-Z]$/;

export function normalizeTableLetter(value: string | null | undefined): string {
  const trimmed = value?.trim().toUpperCase() ?? "";
  if (!trimmed || !TABLE_ID_PATTERN.test(trimmed)) return "";
  return trimmed;
}

export function isValidTableLetterInput(value: string): boolean {
  return normalizeTableLetter(value) !== "";
}

export function formatTableLabel(tableLetter: string): string {
  const letter = normalizeTableLetter(tableLetter);
  return letter ? `Table ${letter}` : "";
}

export function cartStorageKey(tableLetter: string): string {
  const letter = normalizeTableLetter(tableLetter);
  return letter ? `tablebite_cart_${letter}` : "tablebite_cart_guest";
}

export function ordersStorageKey(tableLetter: string): string {
  const letter = normalizeTableLetter(tableLetter);
  return letter ? `tablebite_orders_${letter}` : "tablebite_orders_guest";
}

export function activeOrderStorageKey(tableLetter: string): string {
  const letter = normalizeTableLetter(tableLetter);
  return letter ? `tablebite_active_order_${letter}` : "tablebite_active_order_guest";
}

export const TABLE_SESSION_STORAGE_KEY = "tablebite_table_letter";

/** Set when staff completes the visit — blocks re-binding ?table= until a fresh QR scan. */
export function tableVisitEndedStorageKey(tableLetter: string): string {
  const letter = normalizeTableLetter(tableLetter);
  return letter ? `tablebite_visit_ended_${letter}` : "";
}

export function markTableVisitEnded(tableLetter: string): void {
  if (typeof window === "undefined") return;
  const key = tableVisitEndedStorageKey(tableLetter);
  if (key) sessionStorage.setItem(key, "1");
}

export function clearTableVisitEndedMark(tableLetter: string): void {
  if (typeof window === "undefined") return;
  const key = tableVisitEndedStorageKey(tableLetter);
  if (key) sessionStorage.removeItem(key);
}

export function isTableVisitEnded(tableLetter: string): boolean {
  if (typeof window === "undefined") return false;
  const key = tableVisitEndedStorageKey(tableLetter);
  return key ? sessionStorage.getItem(key) === "1" : false;
}

/** True when navigation likely came from scanning the table QR (not an in-app link). */
export function isLikelyFreshQrEntry(): boolean {
  if (typeof window === "undefined") return false;
  const ref = document.referrer;
  if (!ref) return true;
  try {
    return new URL(ref).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/** Fired on window when staff completes the table visit and client storage is cleared. */
export const TABLE_VISIT_ENDED_EVENT = "tablebite:visit-ended";

export interface TableVisitEndedDetail {
  tableLetter: string;
}
