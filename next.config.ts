import type { NextConfig } from "next";
import os from "os";

function getLanIpv4Addresses(): string[] {
  const candidates = new Set<string>();

  for (const interfaces of Object.values(os.networkInterfaces())) {
    if (!interfaces) continue;
    for (const iface of interfaces) {
      const isIpv4 = iface.family === "IPv4" || iface.family === 4;
      if (!isIpv4 || iface.internal) continue;
      if (iface.address.startsWith("169.254.")) continue;
      candidates.add(iface.address);
    }
  }

  return [...candidates];
}

const nextConfig: NextConfig = {
  // Allow phone/LAN access during `npm run dev` (e.g. http://192.168.x.x:3000).
  allowedDevOrigins: getLanIpv4Addresses(),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
