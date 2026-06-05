import Link from "next/link";
import { Suspense } from "react";
import { AccessDeniedMessage } from "@/app/menu/access-denied/AccessDeniedMessage";

export default function MenuAccessDeniedPage() {
  return (
    <div className="customer-page-shell flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <main className="customer-page-scroll mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-md py-xl text-center">
        <span className="material-symbols-outlined text-4xl text-on-surface-variant">
          qr_code_scanner
        </span>
        <h1 className="text-headline-md font-bold text-on-surface">Scan your table QR</h1>
        <Suspense fallback={<p className="text-on-surface-variant">Checking access…</p>}>
          <AccessDeniedMessage />
        </Suspense>
        <Link
          href="/qr"
          className="mt-2 rounded-full bg-secondary px-6 py-3 text-sm font-bold text-on-secondary"
        >
          How to order
        </Link>
      </main>
    </div>
  );
}
