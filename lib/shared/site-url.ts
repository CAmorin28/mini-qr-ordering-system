import { resolveScannableOriginFromRequest } from "@/lib/server/qr-origin.server";
import { menuUrlFromOrigin } from "@/lib/shared/menu-url";

/**
 * Resolve site origin (protocol + host) for QR codes and absolute links.
 *
 * On Vercel, the request host (`x-forwarded-host`) is used when you open the app
 * on your live domain. Set `NEXT_PUBLIC_APP_URL` in Vercel → Environment Variables
 * (Production) to lock QR codes to your canonical domain (recommended for custom domains).
 */
export async function getSiteOrigin(): Promise<string> {
  return resolveScannableOriginFromRequest();
}

/** Absolute URL of the customer menu (`/menu`), with optional table letter. */
export async function getMenuPageUrl(tableLetter?: string): Promise<string> {
  const origin = await getSiteOrigin();
  const letter =
    tableLetter?.trim().toUpperCase() ||
    process.env.NEXT_PUBLIC_TABLE_LETTER?.trim().toUpperCase();
  return menuUrlFromOrigin(origin, letter || undefined);
}
