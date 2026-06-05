import type { ReactNode } from "react";
import { enforceGuestQrAccess } from "@/lib/guest-session-guard";

export default async function OrdersLayout({ children }: { children: ReactNode }) {
  await enforceGuestQrAccess();
  return children;
}
