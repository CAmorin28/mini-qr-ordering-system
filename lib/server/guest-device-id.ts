import { randomBytes } from "crypto";

/** Long-lived device identifier — one browser profile per physical device. */
export const GUEST_DEVICE_COOKIE = "tablebite_guest_device";

export const GUEST_DEVICE_MAX_AGE_SEC = 60 * 60 * 24 * 365;

const DEVICE_ID_PATTERN = /^[a-f0-9]{32}$/;

export function generateGuestDeviceId(): string {
  return randomBytes(16).toString("hex");
}

export function normalizeGuestDeviceId(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!DEVICE_ID_PATTERN.test(trimmed)) return null;
  return trimmed;
}

export function guestDeviceIdFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${GUEST_DEVICE_COOKIE}=([^;]+)`),
  );
  const raw = match?.[1] ? decodeURIComponent(match[1]) : undefined;
  return normalizeGuestDeviceId(raw);
}

export function guestDeviceCookieOptions(opts?: { secure?: boolean }) {
  const secure =
    opts?.secure ??
    (process.env.NODE_ENV === "production" ? true : false);

  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: GUEST_DEVICE_MAX_AGE_SEC,
  };
}
