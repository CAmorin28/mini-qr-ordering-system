/** Max length for admin-entered table identifiers (letters/numbers). */
export const TABLE_ID_MAX_LENGTH = 4;

const TABLE_ID_PATTERN = /^[A-Z0-9]{1,4}$/;

export function normalizeTableLetter(value: string | null | undefined): string {
  const trimmed = value?.trim().toUpperCase() ?? "";
  if (!trimmed || !TABLE_ID_PATTERN.test(trimmed)) return "";
  return trimmed;
}

export function isValidTableLetterInput(value: string): boolean {
  const trimmed = value.trim().toUpperCase();
  if (!trimmed || trimmed.length > TABLE_ID_MAX_LENGTH) return false;
  return /^[A-Z0-9]+$/.test(trimmed);
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
