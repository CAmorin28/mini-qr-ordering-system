"use client";

const STEPS = [
  { id: 1, label: "Order summary" },
  { id: 2, label: "Review & pay" },
  { id: 3, label: "Confirmation" },
] as const;

interface CheckoutStepperProps {
  current: 1 | 2 | 3;
}

export function CheckoutStepper({ current }: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="checkout-stepper">
      <ol className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex min-w-0 flex-1 items-center">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                    active
                      ? "bg-secondary-container text-on-secondary-container shadow-sm"
                      : done
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant"
                  }`}
                >
                  {done ? (
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  ) : (
                    step.id
                  )}
                </span>
                <span
                  className={`hidden max-w-[7rem] truncate text-center text-xs font-semibold sm:block ${
                    active ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-1 h-0.5 min-w-[12px] flex-1 rounded-full ${
                    step.id < current ? "bg-secondary-container" : "bg-surface-variant"
                  }`}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
