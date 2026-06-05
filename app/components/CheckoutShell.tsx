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

  /** Pinned to bottom on mobile; shown in aside column on desktop. */

  footerActions?: ReactNode;

  /** Wraps main + aside in one form (review & pay). */

  onSubmit?: FormEventHandler<HTMLFormElement>;

  /** On narrow screens, render the aside column above main (e.g. confirmation success). */

  asideFirstOnMobile?: boolean;

}



const LAYOUT_CLASS = "checkout-layout";

const CHECKOUT_FORM_ID = "checkout-form";



export function CheckoutShell({

  step,

  title,

  subtitle,

  children,

  aside,

  footerActions,

  onSubmit,

  asideFirstOnMobile = false,

}: CheckoutShellProps) {

  const asideWithDesktopActions = aside ? (

    <aside className="checkout-layout__aside mt-lg min-w-0 lg:mt-0">

      <div className="checkout-aside-sticky space-y-md">

        {aside}

        {footerActions ? (

          <div className="checkout-actions checkout-aside-actions checkout-aside-actions--desktop">

            {footerActions}

          </div>

        ) : null}

      </div>

    </aside>

  ) : null;



  const layoutBody = (

    <>

      <div className="checkout-layout__main min-w-0 space-y-md lg:space-y-5">{children}</div>

      {asideWithDesktopActions}

    </>

  );



  const hero = (

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

  );



  const scrollMain = (

    <main className="checkout-page-main customer-page-scroll page-main page-main--checkout mx-auto w-full min-w-0 flex-1 min-h-0 px-margin-mobile pt-[calc(var(--header-height)+env(safe-area-inset-top,0px)+12px)] md:px-margin-desktop">

      {hero}

      <PageEnter>

        {aside ? (

          <div
            className={`${LAYOUT_CLASS}${asideFirstOnMobile ? " checkout-layout--aside-first-mobile" : ""}`}
          >
            {layoutBody}
          </div>

        ) : (

          <div className="checkout-layout">{children}</div>

        )}

      </PageEnter>

    </main>

  );



  const mobileFooter =

    footerActions ? (

      <footer className="checkout-mobile-footer shrink-0 lg:hidden">

        <div className="checkout-actions checkout-aside-actions">{footerActions}</div>

      </footer>

    ) : null;



  const pageBody =

    aside && onSubmit ? (

      <form

        id={CHECKOUT_FORM_ID}

        onSubmit={onSubmit}

        className="checkout-page-body flex min-h-0 w-full flex-1 flex-col overflow-hidden"

      >

        {scrollMain}

        {mobileFooter}

      </form>

    ) : (

      <div className="checkout-page-body flex min-h-0 w-full flex-1 flex-col overflow-hidden">

        {scrollMain}

        {mobileFooter}

      </div>

    );



  return (

    <div className="checkout-page customer-page-shell flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col bg-background">

      <Header showCart={false} showBackToMenu showOrderStatus />

      {pageBody}

    </div>

  );

}


