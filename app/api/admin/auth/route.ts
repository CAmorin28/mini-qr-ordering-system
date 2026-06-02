import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  adminSessionCookieOptions,
  createAdminSessionToken,
  getAdminSessionFromCookies,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

/** GET /api/admin/auth — session status */
export async function GET() {
  const authenticated = await getAdminSessionFromCookies();
  return NextResponse.json({ configured: true, authenticated });
}

/** POST /api/admin/auth — sign in with username + password */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const username =
    body && typeof body === "object" && "username" in body
      ? String((body as { username: unknown }).username)
      : "";
  const password =
    body && typeof body === "object" && "password" in body
      ? String((body as { password: unknown }).password)
      : "";

  if (!verifyAdminCredentials(username, password)) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminSessionCookieOptions());

  return NextResponse.json({ ok: true });
}

/** DELETE /api/admin/auth — sign out */
export async function DELETE() {
  const store = await cookies();
  store.delete(ADMIN_SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
