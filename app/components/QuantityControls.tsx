"use client";

interface QuantityControlsProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function QuantityControls({
  quantity,
  onIncrement,
  onDecrement,
  size = "md",
  className = "",
}: QuantityControlsProps) {
  const btn =
    size === "sm"
      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
      : "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg";
  const icon = size === "sm" ? "text-[16px]" : "text-[18px]";
  const qtyWidth = size === "sm" ? "w-8" : "w-9";

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-container p-1 ${className}`.trim()}
    >
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className={`${btn} touch-target bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-variant`}
      >
        <span className={`material-symbols-outlined ${icon}`}>remove</span>
      </button>
      <span
        className={`${qtyWidth} shrink-0 text-center text-label-lg font-semibold tabular-nums leading-none`}
      >
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className={`${btn} touch-target bg-secondary-container text-on-secondary-container transition-colors hover:brightness-105`}
      >
        <span className={`material-symbols-outlined ${icon}`}>add</span>
      </button>
    </div>
  );
}
