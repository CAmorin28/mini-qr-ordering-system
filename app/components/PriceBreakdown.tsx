"use client";

import {
  computeGrandTotal,
} from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

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
  const rowClass = compact
    ? "flex justify-between text-sm"
    : "flex justify-between text-body-lg";

  return (
    <div className="space-y-2 border-t border-surface-variant pt-md">
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
        className={`flex items-end justify-between border-t border-dashed border-surface-variant pt-sm ${
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
