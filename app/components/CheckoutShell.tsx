"use client";

import { Header } from "@/app/components/Header";
import { CheckoutStepper } from "@/app/components/CheckoutStepper";
import { PageEnter } from "@/app/components/ui/PageEnter";
import type { FormEventHandler, ReactNode } from "react";

interface CheckoutShellProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Sticky order summary / totals column (desktop — Foodpanda-style). */
  aside?: ReactNode;
  /** Wraps main + aside in one form (review & pay). */
  onSubmit?: FormEventHandler<HTMLFormElement>;
}

const LAYOUT_CLASS = "checkout-layout";

export function CheckoutShell({
  step,
  title,
  subtitle,
  children,
  aside,
  onSubmit,
}: CheckoutShellProps) {
  const layoutBody = (
    <>
      <div className="checkout-layout__main min-w-0 space-y-md lg:space-y-5">{children}</div>
      {aside ? (
        <aside className="checkout-layout__aside mt-lg min-w-0 lg:mt-0">
          <div className="checkout-aside-sticky space-y-md">{aside}</div>
        </aside>
      ) : null}
    </>
  );

  return (
    <div className="checkout-page flex min-h-dvh w-full min-w-0 max-w-full flex-col overflow-x-clip bg-background">
      <Header showCart showBackToMenu showOrderStatus />
      <main className="checkout-page-main page-main page-main--checkout mx-auto w-full min-w-0 flex-1 overflow-x-clip px-margin-mobile pt-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] md:px-margin-desktop">
        <div className="checkout-hero mb-md rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-[0_8px_32px_rgba(29,29,53,0.06)] sm:p-lg lg:mb-lg">
          <div className="checkout-hero__heading text-left">
            <h1 className="checkout-page-title text-balance text-xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-body-readable mt-1.5 text-sm text-on-surface-variant sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
          <div className="checkout-hero__stepper mt-md border-t border-surface-variant/50 pt-md sm:mt-lg sm:pt-lg lg:mt-0 lg:border-t-0 lg:pt-0">
            <CheckoutStepper current={step} />
          </div>
        </div>

        <PageEnter>
          {aside ? (
            onSubmit ? (
              <form onSubmit={onSubmit} className={LAYOUT_CLASS}>
                {layoutBody}
              </form>
            ) : (
              <div className={LAYOUT_CLASS}>{layoutBody}</div>
            )
          ) : (
            <div className="checkout-layout">{children}</div>
          )}
        </PageEnter>
      </main>
    </div>
  );
}
