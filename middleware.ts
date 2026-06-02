import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { MENU_PAGE_PATH } from "@/lib/menu-url";

/** Staff open the QR display page with this query param. */
export const STAFF_QR_VIEW_PARAM = "view";
export const STAFF_QR_VIEW_VALUE = "staff";

/**
 * Guests who land on /qr (e.g. old printed codes) are sent to the menu.
 * Staff use /qr?view=staff to show the QR code.
 */
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname !== "/qr") {
    return NextResponse.next();
  }

  if (
    request.nextUrl.searchParams.get(STAFF_QR_VIEW_PARAM) ===
    STAFF_QR_VIEW_VALUE
  ) {
    return NextResponse.next();
  }

  const menuUrl = request.nextUrl.clone();
  menuUrl.pathname = MENU_PAGE_PATH;
  menuUrl.search = "";
  return NextResponse.redirect(menuUrl);
}

export const config = {
  matcher: "/qr",
};
