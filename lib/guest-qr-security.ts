function envFlag(name: string): string | undefined {
  return process.env[name]?.trim().toLowerCase();
}

function isTruthyFlag(value: string | undefined): boolean {
  return value === "true" || value === "1" || value === "on" || value === "yes";
}

function isFalsyFlag(value: string | undefined): boolean {
  return value === "false" || value === "0" || value === "off" || value === "no";
}

/** True when QR device-binding and menu access control are enforced. */
export function isGuestQrSecurityEnabled(_hostHeader?: string | null): boolean {
  const override = envFlag("GUEST_QR_SECURITY");
  if (isFalsyFlag(override)) return false;
  if (isTruthyFlag(override)) return true;
  return true;
}

/** Client-side hint — keep in sync with server (default on everywhere). */
export function isGuestQrSecurityEnabledClient(): boolean {
  const override = envFlag("NEXT_PUBLIC_GUEST_QR_SECURITY");
  if (isFalsyFlag(override)) return false;
  if (isTruthyFlag(override)) return true;
  return true;
}
