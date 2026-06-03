"use client";

import { Header } from "@/app/components/Header";
import { CheckoutStepper } from "@/app/components/CheckoutStepper";
import { PageEnter } from "@/app/components/ui/PageEnter";
import type { ReactNode } from "react";

interface CheckoutShellProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function CheckoutShell({ step, title, subtitle, children }: CheckoutShellProps) {
  return (
    <div className="checkout-page flex min-h-dvh w-full max-w-full flex-col overflow-x-clip bg-background">
      <Header showCart showBackToMenu showOrderStatus />
      <main className="page-main page-main--checkout mx-auto w-full min-w-0 max-w-3xl flex-1 overflow-x-clip px-margin-mobile pt-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] md:px-margin-desktop">
        <div className="checkout-hero mb-lg rounded-2xl border border-surface-variant bg-surface-container-lowest p-md shadow-[0_8px_32px_rgba(29,29,53,0.06)] sm:p-lg">
          <CheckoutStepper current={step} />
          <div className="checkout-hero__heading mt-md border-t border-surface-variant/50 pt-md text-left sm:mt-lg sm:pt-lg">
            <h1 className="text-balance text-xl font-bold tracking-tight text-on-surface sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-body-readable mt-1.5 text-sm text-on-surface-variant sm:text-base">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        <PageEnter>{children}</PageEnter>
      </main>
    </div>
  );
}
