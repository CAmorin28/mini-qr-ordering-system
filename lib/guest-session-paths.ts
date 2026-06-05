export const GUEST_ACCESS_DENIED_PATH = "/menu/access-denied" as const;

export type GuestAccessDeniedReason =
  | "scan_required"
  | "no_session"
  | "invalid_session"
  | "table_mismatch"
  | "device_locked"
  | "visit_ended"
  | "active_orders";

export function guestAccessDeniedUrl(reason: GuestAccessDeniedReason): string {
  return `${GUEST_ACCESS_DENIED_PATH}?reason=${reason}`;
}
