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

export function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** True when an env URL points at local dev, not a live deployment host. */
export function isLoopbackOrigin(origin: string | null | undefined): boolean {
  if (!origin) return false;
  try {
    return isLoopbackHost(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function isPrivateLanHost(hostname: string): boolean {
  return (
    hostname.endsWith(".local") ||
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
}

/** True when QR should use the browser origin instead of the server-rendered URL. */
export function shouldRefreshQrFromBrowser(serverMenuUrl: string): boolean {
  if (typeof window === "undefined") return false;

  const browserHost = window.location.hostname;
  const canonical = originFromEnvValue(process.env.NEXT_PUBLIC_APP_URL);

  // Local dev: NEXT_PUBLIC_APP_URL is often localhost, but phones must scan a LAN IP.
  if (canonical) {
    try {
      const canonicalHost = new URL(canonical).hostname;
      if (isLoopbackHost(canonicalHost)) {
        if (isPrivateLanHost(browserHost) || !isLoopbackHost(browserHost)) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  const clientMenuUrl = new URL("/menu", window.location.origin).href;
  if (clientMenuUrl === serverMenuUrl) return false;

  return (
    isLoopbackHost(browserHost) ||
    isPrivateLanHost(browserHost)
  );
}
