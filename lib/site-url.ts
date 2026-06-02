import { headers } from "next/headers";
import { menuUrlFromOrigin } from "@/lib/menu-url";

/** Resolve site origin (protocol + host), ignoring any path in env URLs. */
async function getSiteOrigin(): Promise<string> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (host) {
    const hostname = host.split(",")[0]?.trim().split("/")[0] ?? host;
    return `${protocol}://${hostname}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_APP_URL).origin;
    } catch {
      /* fall through */
    }
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

/** Absolute URL of the customer menu (home page). */
export async function getMenuPageUrl(): Promise<string> {
  const origin = await getSiteOrigin();
  return menuUrlFromOrigin(origin);
}
