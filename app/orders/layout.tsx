import type { ReactNode } from "react";
import { enforceGuestQrAccess } from "@/lib/server/guest-session-guard";

export default async function OrdersLayout({ children }: { children: ReactNode }) {
  await enforceGuestQrAccess({ redirectIfMissing: true });
  return children;
}
