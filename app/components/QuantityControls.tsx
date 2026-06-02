"use client";

interface QuantityControlsProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
  size?: "sm" | "md";
}

export function QuantityControls({
  quantity,
  onIncrement,
  onDecrement,
  size = "md",
}: QuantityControlsProps) {
  const btn =
    size === "sm"
      ? "flex h-7 w-7 items-center justify-center rounded-md"
      : "flex h-8 w-8 items-center justify-center rounded-lg";
  const icon = size === "sm" ? "text-[16px]" : "text-[18px]";

  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-container p-1">
      <button
        type="button"
        onClick={onDecrement}
        aria-label="Decrease quantity"
        className={`${btn} bg-surface-container-lowest text-on-surface transition-colors hover:bg-surface-variant`}
      >
        <span className={`material-symbols-outlined ${icon}`}>remove</span>
      </button>
      <span className="min-w-[1.5rem] text-center text-label-lg font-semibold tabular-nums">
        {quantity}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase quantity"
        className={`${btn} bg-secondary-container text-on-secondary-container transition-colors hover:brightness-105`}
      >
        <span className={`material-symbols-outlined ${icon}`}>add</span>
      </button>
    </div>
  );
}
