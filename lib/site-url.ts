import { headers } from "next/headers";

/** Absolute URL of the customer menu (home page). */
export async function getMenuPageUrl(): Promise<string> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (host) {
    return new URL("/", `${protocol}://${host}`).href;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return new URL("/", process.env.NEXT_PUBLIC_APP_URL).href;
  }

  if (process.env.VERCEL_URL) {
    return new URL("/", `https://${process.env.VERCEL_URL}`).href;
  }

  return "http://localhost:3000/";
}
