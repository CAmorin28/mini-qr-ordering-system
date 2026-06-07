export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import CheckoutReviewClient from "@/components/checkout/CheckoutReviewClient";

export default function CheckoutReviewPage() {
  return (
    <Suspense fallback={<LoadingBlock fullPage message="Loading checkout…" />}>
      <CheckoutReviewClient />
    </Suspense>
  );
}
