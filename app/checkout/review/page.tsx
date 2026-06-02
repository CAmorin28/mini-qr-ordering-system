export const dynamic = "force-dynamic";

import { Suspense } from "react";
import CheckoutReviewClient from "./CheckoutReviewClient";

export default function CheckoutReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-on-surface-variant">
          Loading checkout…
        </div>
      }
    >
      <CheckoutReviewClient />
    </Suspense>
  );
}
