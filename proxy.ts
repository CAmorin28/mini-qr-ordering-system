import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_QR_PAGE_PATH } from "@/lib/shared/menu-url";

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
 * Legacy staff link: `/qr?view=staff` should go to the staff Table QR generator.
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

  // Guests must be able to open `/qr` to understand how ordering works.
  // Redirecting to `/admin/qr` based on an existing admin cookie would leak the staff area.
  // Admin QR codes are private and should be accessed via `/admin/qr` (or legacy `?view=staff`).
  return NextResponse.next();
}

export const config = {
  matcher: "/qr",
};
