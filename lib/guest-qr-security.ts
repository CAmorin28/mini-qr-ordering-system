import { isLoopbackHost, isPrivateLanHost } from "@/lib/origin";

function envFlag(name: string): string | undefined {
  return process.env[name]?.trim().toLowerCase();
}

function isTruthyFlag(value: string | undefined): boolean {
  return value === "true" || value === "1" || value === "on" || value === "yes";
}

function isFalsyFlag(value: string | undefined): boolean {
  return value === "false" || value === "0" || value === "off" || value === "no";
}

function hostFromHeader(hostHeader: string | null | undefined): string {
  if (!hostHeader) return "";
  return hostHeader.split(":")[0]?.trim() ?? "";
}

/** True when QR device-binding and menu access control are enforced (production live server). */
export function isGuestQrSecurityEnabled(hostHeader?: string | null): boolean {
  const override = envFlag("GUEST_QR_SECURITY");
  if (isFalsyFlag(override)) return false;
  if (isTruthyFlag(override)) return true;

  if (process.env.NODE_ENV !== "production") return false;

  const host = hostFromHeader(hostHeader ?? null);
  if (host && (isLoopbackHost(host) || isPrivateLanHost(host))) {
    return false;
  }

  return true;
}

/** Client-side hint — production builds on a public host should enforce QR security. */
export function isGuestQrSecurityEnabledClient(): boolean {
  const override = envFlag("NEXT_PUBLIC_GUEST_QR_SECURITY");
  if (isFalsyFlag(override)) return false;
  if (isTruthyFlag(override)) return true;

  if (process.env.NODE_ENV !== "production") return false;
  if (typeof window === "undefined") return false;

  const host = window.location.hostname;
  return !isLoopbackHost(host) && !isPrivateLanHost(host);
}
