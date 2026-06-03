export const dynamic = "force-dynamic";

import { Suspense } from "react";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
import CheckoutReviewClient from "./CheckoutReviewClient";

export default function CheckoutReviewPage() {
  return (
    <Suspense fallback={<LoadingBlock fullPage message="Loading checkout…" />}>
      <CheckoutReviewClient />
    </Suspense>
  );
}
