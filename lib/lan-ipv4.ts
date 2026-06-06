import os from "os";

function isIpv4Family(family: string | number): boolean {
  return family === "IPv4" || family === 4;
}

/** Non-internal IPv4 addresses on the local machine (for dev QR codes). */
export function getLanIpv4Addresses(): string[] {
  const candidates = new Set<string>();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      if (!isIpv4Family(iface.family) || iface.internal) continue;
      if (iface.address.startsWith("169.254.")) continue;
      candidates.add(iface.address);
    }
  }

  return [...candidates];
}

export function pickBestLanIpv4Address(): string | null {
  const addresses = getLanIpv4Addresses();
  return addresses.find((address) => address.startsWith("192.168.")) ?? addresses[0] ?? null;
}
