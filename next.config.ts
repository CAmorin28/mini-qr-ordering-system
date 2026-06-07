import type { NextConfig } from "next";
import { getLanIpv4Addresses } from "./lib/server/lan-ipv4";

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
