import {
  isLoopbackHost,
  isLoopbackOrigin,
  originFromEnvValue,
} from "@/lib/shared/origin";

export function buildOriginFromHost(host: string, protocol: string): string {
  const hostname = host.split(",")[0]?.trim().split("/")[0] ?? host;
  return `${protocol}://${hostname}`;
}

export function originFromUrl(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function isLoopbackUrl(url: string): boolean {
  const origin = originFromUrl(url);
  if (!origin) return false;
  return isLoopbackHost(new URL(origin).hostname);
}

export function readPublicAppUrl(): string | null {
  return originFromEnvValue(process.env.NEXT_PUBLIC_APP_URL);
}

/**
 * Single rule set for QR/link origins on localhost, LAN, and live deployments.
 *
 * - Live: use non-loopback NEXT_PUBLIC_APP_URL when configured (ignored on Vercel if loopback).
 * - Localhost: never encode loopback in QR — use loopbackReplacement (LAN IP from the server).
 * - LAN / live request host: use the active request or browser origin as-is.
 */
export function resolveScannableOrigin(options: {
  activeOrigin: string;
  loopbackReplacement?: string | null;
  ignoreLoopbackCanonicalOnVercel?: boolean;
}): string {
  const canonical = readPublicAppUrl();
  const useCanonical =
    Boolean(canonical) &&
    !(options.ignoreLoopbackCanonicalOnVercel && isLoopbackOrigin(canonical));

  if (useCanonical && canonical && !isLoopbackHost(new URL(canonical).hostname)) {
    return canonical;
  }

  if (options.loopbackReplacement && isLoopbackUrl(options.activeOrigin)) {
    return options.loopbackReplacement;
  }

  return options.activeOrigin;
}
