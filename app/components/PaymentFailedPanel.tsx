"use client";

interface PaymentFailedPanelProps {
  message: string;
  onRetry: () => void;
}

export function PaymentFailedPanel({ message, onRetry }: PaymentFailedPanelProps) {
  return (
    <div
      className="rounded-2xl border border-error/40 bg-error-container/50 p-lg"
      role="alert"
    >
      <div className="flex gap-md">
        <span className="material-symbols-outlined shrink-0 text-[32px] text-error">
          error
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-error">Payment failed</h3>
          <p className="mt-1 text-sm text-on-surface">{message}</p>
          <p className="mt-2 text-xs text-on-surface-variant">
            Your order is still <strong>pending</strong>. Your cart was not cleared.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-md inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-primary px-lg py-2.5 text-sm font-bold text-on-primary sm:w-auto"
          >
            <span className="material-symbols-outlined text-[20px]">refresh</span>
            Retry payment
          </button>
        </div>
      </div>
    </div>
  );
}
