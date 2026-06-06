import "server-only";

import { pickBestLanIpv4Address } from "@/lib/lan-ipv4";
import { isLoopbackHost } from "@/lib/origin";

/** Replace localhost / 127.0.0.1 with a LAN IP so phone QR scans reach the dev server. */
export function preferLanOriginWhenLoopback(origin: string): string {
  try {
    const url = new URL(origin);
    if (!isLoopbackHost(url.hostname)) return origin;

    const lan = pickBestLanIpv4Address();
    if (!lan) return origin;

    url.hostname = lan;
    return url.origin;
  } catch {
    return origin;
  }
}

/** LAN origin for the current dev host (e.g. http://192.168.1.5:3000), or null when not on loopback. */
export function devNetworkOriginFromHost(host: string | null | undefined): string | null {
  if (!host?.trim()) return null;

  const trimmed = host.split(",")[0]?.trim() ?? host;
  const [hostname, portPart] = trimmed.split(":");
  if (!hostname || !isLoopbackHost(hostname)) return null;

  const lan = pickBestLanIpv4Address();
  if (!lan) return null;

  const port = portPart || "3000";
  return `http://${lan}:${port}`;
}
