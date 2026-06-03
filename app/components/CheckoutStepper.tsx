"use client";

const STEPS = [
  { id: 1, label: "Order summary", shortLabel: "Summary" },
  { id: 2, label: "Review & pay", shortLabel: "Pay" },
  { id: 3, label: "Confirmation", shortLabel: "Done" },
] as const;

interface CheckoutStepperProps {
  current: 1 | 2 | 3;
}

export function CheckoutStepper({ current }: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="checkout-stepper w-full">
      <ol className="flex w-full list-none items-start p-0">
        {STEPS.map((step, index) => {
          const done = step.id < current;
          const active = step.id === current;
          const isFirst = index === 0;
          const isLast = index === STEPS.length - 1;
          const lineBeforeDone = current >= step.id;
          const lineAfterDone = step.id < current;

          return (
            <li
              key={step.id}
              className="checkout-stepper__step relative flex min-w-0 flex-1 flex-col items-center"
            >
              <div className="flex w-full items-center">
                {!isFirst ? (
                  <div
                    className={`h-0.5 min-h-px flex-1 rounded-full ${
                      lineBeforeDone ? "bg-secondary-container" : "bg-surface-variant"
                    }`}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}

                <span
                  className={`relative z-[1] mx-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors sm:mx-1 sm:h-10 sm:w-10 ${
                    active
                      ? "bg-secondary-container text-on-secondary-container shadow-sm"
                      : done
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container text-on-surface-variant"
                  }`}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <span className="material-symbols-outlined text-[20px]">check</span>
                  ) : (
                    step.id
                  )}
                </span>

                {!isLast ? (
                  <div
                    className={`h-0.5 min-h-px flex-1 rounded-full ${
                      lineAfterDone ? "bg-secondary-container" : "bg-surface-variant"
                    }`}
                    aria-hidden
                  />
                ) : (
                  <span className="flex-1" aria-hidden />
                )}
              </div>

              <span
                className={`checkout-stepper__label mt-2 ${
                  active ? "text-on-surface" : "text-on-surface-variant"
                }`}
                aria-hidden={false}
              >
                <span className="md:hidden">{step.shortLabel}</span>
                <span className="hidden md:inline">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
