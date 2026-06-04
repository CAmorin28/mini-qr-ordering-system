import { headers } from "next/headers";
import {
  getDeploymentOrigin,
  isLoopbackOrigin,
  originFromEnvValue,
} from "@/lib/origin";
import { menuUrlFromOrigin } from "@/lib/menu-url";

/**
 * Resolve site origin (protocol + host) for QR codes and absolute links.
 *
 * On Vercel, the request host (`x-forwarded-host`) is used when you open the app
 * on your live domain. Set `NEXT_PUBLIC_APP_URL` in Vercel → Environment Variables
 * (Production) to lock QR codes to your canonical domain (recommended for custom domains).
 */
export async function getSiteOrigin(): Promise<string> {
  const canonical = originFromEnvValue(process.env.NEXT_PUBLIC_APP_URL);
  // Ignore localhost NEXT_PUBLIC_APP_URL on Vercel — it breaks deployed QR codes.
  const useCanonical =
    canonical && !(process.env.VERCEL && isLoopbackOrigin(canonical));
  if (useCanonical) return canonical;

  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol =
    headersList.get("x-forwarded-proto") ??
    (process.env.VERCEL ? "https" : "http");

  if (host) {
    const hostname = host.split(",")[0]?.trim().split("/")[0] ?? host;
    return `${protocol}://${hostname}`;
  }

  const deployment = getDeploymentOrigin();
  if (deployment) return deployment;

  return "http://localhost:3000";
}

/** Absolute URL of the customer menu (`/menu`), with optional table letter. */
export async function getMenuPageUrl(tableLetter?: string): Promise<string> {
  const origin = await getSiteOrigin();
  const letter =
    tableLetter?.trim().toUpperCase() ||
    process.env.NEXT_PUBLIC_TABLE_LETTER?.trim().toUpperCase();
  return menuUrlFromOrigin(origin, letter || undefined);
}
