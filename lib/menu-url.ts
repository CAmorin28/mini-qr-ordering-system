/** Customer ordering page — never the staff `/qr` display page. */
export const MENU_PAGE_PATH = "/menu" as const;

export const CHECKOUT_PAGE_PATH = "/checkout" as const;
export const CHECKOUT_REVIEW_PATH = "/checkout/review" as const;
export const ORDERS_HISTORY_PATH = "/orders" as const;

export const ADMIN_LOGIN_PATH = "/admin/login" as const;
export const ADMIN_DASHBOARD_PATH = "/admin" as const;

export function checkoutConfirmationPath(orderId: string): string {
  return `/checkout/confirmation/${encodeURIComponent(orderId)}`;
}

/** Staff-only URL to open the QR display page (mobile + desktop). */
export const STAFF_QR_PAGE_PATH = "/qr?view=staff" as const;

/** Build the absolute menu URL from a site origin (no path segment). */
export function menuUrlFromOrigin(origin: string): string {
  return new URL(MENU_PAGE_PATH, origin).href;
}

/** Menu URL for the current browser tab (client only). */
export function menuUrlFromWindow(): string | null {
  if (typeof window === "undefined") return null;
  return menuUrlFromOrigin(window.location.origin);
}
