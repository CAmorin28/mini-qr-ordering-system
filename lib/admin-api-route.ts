import { NextResponse } from "next/server";
import { getAdminSessionFromCookies } from "@/lib/admin-auth";

export async function requireAdminSession(): Promise<NextResponse | null> {
  const authenticated = await getAdminSessionFromCookies();
  if (!authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
