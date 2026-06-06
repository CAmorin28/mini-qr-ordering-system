import "server-only";

import { headers } from "next/headers";
import {
  devNetworkOriginFromHost,
  preferLanOriginWhenLoopback,
} from "@/lib/dev-network-origin.server";
import { getDeploymentOrigin } from "@/lib/origin";
import { buildOriginFromHost, resolveScannableOrigin } from "@/lib/qr-origin";

/** Resolve the origin encoded in table QR codes for the current request. */
export async function resolveScannableOriginFromRequest(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");
  const protocol =
    headersList.get("x-forwarded-proto") ??
    (process.env.VERCEL ? "https" : "http");

  let activeOrigin = getDeploymentOrigin() ?? "http://localhost:3000";
  if (host) {
    activeOrigin = buildOriginFromHost(host, protocol);
  }

  const loopbackReplacement =
    devNetworkOriginFromHost(host) ?? preferLanOriginWhenLoopback(activeOrigin);

  return resolveScannableOrigin({
    activeOrigin,
    loopbackReplacement:
      loopbackReplacement !== activeOrigin ? loopbackReplacement : null,
    ignoreLoopbackCanonicalOnVercel: Boolean(process.env.VERCEL),
  });
}
