import Link from "next/link";
import { Suspense } from "react";
import { GuestStatusScreen } from "@/app/components/GuestStatusScreen";
import { AccessDeniedMessage } from "@/app/menu/access-denied/AccessDeniedMessage";

export default function MenuAccessDeniedPage() {
  return (
    <GuestStatusScreen
      title="Scan your table QR"
      action={
        <Link href="/qr" className="guest-status-btn">
          How to order
        </Link>
      }
    >
      <Suspense fallback={<p>Checking access…</p>}>
        <AccessDeniedMessage />
      </Suspense>
    </GuestStatusScreen>
  );
}
