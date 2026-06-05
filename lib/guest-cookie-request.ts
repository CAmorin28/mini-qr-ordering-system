/** Derive cookie Secure from the request — not NODE_ENV (LAN/http dev must stay non-Secure). */
export function guestCookiesSecureFromRequest(request: Request): boolean {
  const forwarded = request.headers.get("x-forwarded-proto");
  if (forwarded) {
    return forwarded.split(",")[0].trim().toLowerCase().includes("https");
  }
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export const GUEST_SESSION_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;
