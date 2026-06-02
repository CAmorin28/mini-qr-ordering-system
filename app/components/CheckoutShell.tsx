"use client";

import Link from "next/link";
import { Header } from "@/app/components/Header";
import { CheckoutStepper } from "@/app/components/CheckoutStepper";
import { MENU_PAGE_PATH } from "@/lib/menu-url";
import type { ReactNode } from "react";

interface CheckoutShellProps {
  step: 1 | 2 | 3;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function CheckoutShell({ step, title, subtitle, children }: CheckoutShellProps) {
  return (
    <div className="checkout-page flex min-h-dvh flex-col bg-background">
      <Header showCart showBackToMenu />
      <main className="mx-auto w-full max-w-3xl flex-1 px-margin-mobile pb-xl pt-[calc(var(--header-height)+16px)] md:px-margin-desktop">
        <Link
          href={MENU_PAGE_PATH}
          className="mb-md inline-flex items-center gap-1 text-sm font-semibold text-on-surface-variant hover:text-secondary"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to menu
        </Link>
        <div className="checkout-hero mb-lg rounded-2xl border border-surface-variant bg-surface-container-lowest p-lg shadow-[0_8px_32px_rgba(29,29,53,0.06)]">
          <CheckoutStepper current={step} />
          <h1 className="mt-lg text-2xl font-bold tracking-tight text-on-surface sm:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-on-surface-variant sm:text-base">{subtitle}</p>
          )}
        </div>
        {children}
      </main>
    </div>
  );
}
