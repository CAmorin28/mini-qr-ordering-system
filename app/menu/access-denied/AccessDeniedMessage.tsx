"use client";

import { useSearchParams } from "next/navigation";
import type { GuestAccessDeniedReason } from "@/lib/guest-session-paths";

const MESSAGES: Record<GuestAccessDeniedReason, string> = {
  scan_required:
    "Open the menu by scanning the QR code on your table. Direct links and bookmarks are not supported on the live ordering site.",
  no_session:
    "This device does not have an active table session. Scan the QR code at your table to start ordering.",
  invalid_session:
    "Your table session has expired or is no longer valid. Scan the QR code again to continue.",
  table_mismatch:
    "This link was opened for a different table or device. Scan the QR code at your own table — shared links will not work.",
  visit_ended:
    "This table visit has ended. Ask staff if you need help, or scan the QR again when your table is ready for the next party.",
};

export function AccessDeniedMessage() {
  const searchParams = useSearchParams();
  const reason = (searchParams.get("reason") ?? "no_session") as GuestAccessDeniedReason;
  const message = MESSAGES[reason] ?? MESSAGES.no_session;

  return <p className="text-on-surface-variant">{message}</p>;
}
