/** Customer ordering page — never the staff `/qr` display page. */
export const MENU_PAGE_PATH = "/" as const;

/** Build the absolute menu URL from a site origin (no path segment). */
export function menuUrlFromOrigin(origin: string): string {
  return new URL(MENU_PAGE_PATH, origin).href;
}

/** Menu URL for the current browser tab (client only). */
export function menuUrlFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return menuUrlFromOrigin(window.location.origin);
}
