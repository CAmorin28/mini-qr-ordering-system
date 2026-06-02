/**
 * Site origin helpers — tuned for Vercel (x-forwarded-* headers, Vercel env vars).
 */

/** Parse a host or full URL into `https://host` (no path). */
export function originFromEnvValue(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(value)
      ? value.trim()
      : `https://${value.trim()}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

/**
 * Vercel / deployment origin when request headers are unavailable.
 * Prefer explicit `NEXT_PUBLIC_APP_URL`, then production domain, then this deployment.
 */
export function getDeploymentOrigin(): string | null {
  const canonical = originFromEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  if (canonical) return canonical;

  if (process.env.VERCEL_ENV === "production") {
    const production = originFromEnvValue(
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined,
    );
    if (production) return production;
  }

  return originFromEnvValue(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  );
}

/** True when the browser host may differ from the server (local Wi‑Fi testing only). */
export function shouldRefreshQrFromBrowser(serverMenuUrl: string): boolean {
  if (typeof window === "undefined") return false;

  // Lock QR to NEXT_PUBLIC_APP_URL (e.g. http://localhost:3000) in local dev.
  if (originFromEnvValue(process.env.NEXT_PUBLIC_APP_URL)) return false;

  const clientMenuUrl = new URL(
    "/menu",
    window.location.origin,
  ).href;
  if (clientMenuUrl === serverMenuUrl) return false;

  const host = window.location.hostname;
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local") ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)
  );
}
