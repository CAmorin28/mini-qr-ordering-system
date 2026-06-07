"use client";

import {
  computeGrandTotal,
} from "@/lib/shared/checkout";
import { formatPrice } from "@/lib/shared/format";

interface PriceBreakdownProps {
  subtotal: number;
  showCutleryNote?: boolean;
  cutlery?: boolean;
  compact?: boolean;
}

export function PriceBreakdown({
  subtotal,
  showCutleryNote,
  cutlery,
  compact,
}: PriceBreakdownProps) {
  const grandTotal = computeGrandTotal(subtotal);
  const rowClass = compact ? "price-row text-sm" : "price-row text-body-lg";

  return (
    <div className="space-y-2 border-t border-surface-variant pt-md text-left">
      <div className={`${rowClass} text-on-surface-variant`}>
        <span>Subtotal</span>
        <span className="font-medium text-on-surface">{formatPrice(subtotal)}</span>
      </div>
      {showCutleryNote && (
        <div className={`${rowClass} text-on-surface-variant`}>
          <span>Cutlery</span>
          <span className="font-medium text-on-surface">
            {cutlery ? "Requested" : "Not requested"}
          </span>
        </div>
      )}
      <div
        className={`price-row items-end border-t border-dashed border-surface-variant pt-sm ${
          compact ? "text-base" : "text-lg"
        }`}
      >
        <span className="font-semibold text-on-surface">Total</span>
        <span className="text-[22px] font-bold leading-none text-secondary">
          {formatPrice(grandTotal)}
        </span>
      </div>
    </div>
  );
}
