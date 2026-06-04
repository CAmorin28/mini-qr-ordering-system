import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from "@/lib/admin-auth";
import { STAFF_QR_PAGE_PATH, MENU_PAGE_PATH } from "@/lib/menu-url";

/** Staff open the QR display page with this query param (legacy URL). */
export const STAFF_QR_VIEW_PARAM = "view";
export const STAFF_QR_VIEW_VALUE = "staff";

function redirectToStaffQrPage(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = STAFF_QR_PAGE_PATH;
  url.searchParams.delete(STAFF_QR_VIEW_PARAM);
  return NextResponse.redirect(url);
}

/**
 * Guests who land on /qr (e.g. old printed codes) are sent to the menu.
 * Staff use /admin/qr (or legacy /qr?view=staff) to generate table QR codes.
 */
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname !== "/qr") {
    return NextResponse.next();
  }

  if (
    request.nextUrl.searchParams.get(STAFF_QR_VIEW_PARAM) === STAFF_QR_VIEW_VALUE
  ) {
    return redirectToStaffQrPage(request);
  }

  const adminSession = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (verifyAdminSessionToken(adminSession)) {
    return redirectToStaffQrPage(request);
  }

  const menuUrl = request.nextUrl.clone();
  menuUrl.pathname = MENU_PAGE_PATH;
  menuUrl.search = "";
  return NextResponse.redirect(menuUrl);
}

export const config = {
  matcher: "/qr",
};
