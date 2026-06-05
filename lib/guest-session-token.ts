import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const GUEST_SESSION_COOKIE = "tablebite_guest_session";

/** Default session lifetime — one dining visit. */
export const GUEST_SESSION_MAX_AGE_SEC = 60 * 60 * 4;

export interface GuestSessionPayload {
  sid: string;
  table: string;
  /** Milliseconds since epoch — must match table_visits.opened_at for this visit. */
  visitOpenedAtMs: number;
  exp: number;
}

function sessionSecret(): string {
  return (
    process.env.GUEST_SESSION_SECRET?.trim() ||
    process.env.ADMIN_SESSION_SECRET?.trim() ||
    "tablebite-guest-session-secret"
  );
}

function encodePayload(payload: GuestSessionPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(encoded: string): GuestSessionPayload | null {
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as GuestSessionPayload;
    if (
      typeof parsed.sid !== "string" ||
      typeof parsed.table !== "string" ||
      typeof parsed.visitOpenedAtMs !== "number" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function signBody(encoded: string): string {
  return createHmac("sha256", sessionSecret()).update(encoded).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function createGuestSessionToken(payload: GuestSessionPayload): string {
  const body = encodePayload(payload);
  return `${body}.${signBody(body)}`;
}

export function verifyGuestSessionToken(token: string | undefined): GuestSessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!safeEqual(sig, signBody(body))) return null;

  const payload = decodePayload(body);
  if (!payload) return null;
  if (Date.now() > payload.exp) return null;
  return payload;
}

export function generateGuestSessionId(): string {
  return randomBytes(32).toString("hex");
}

export function guestSessionCookieOptions(opts?: { secure?: boolean }) {
  const secure =
    opts?.secure ??
    (process.env.NODE_ENV === "production" ? true : false);

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: GUEST_SESSION_MAX_AGE_SEC,
  };
}

export function guestSessionTokenFromRequest(request: Request): GuestSessionPayload | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)tablebite_guest_session=([^;]+)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return verifyGuestSessionToken(token);
}
