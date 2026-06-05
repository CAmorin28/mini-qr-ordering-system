"use client";

import { Header } from "@/app/components/Header";

interface QrPageLayoutProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  /** Shown below the top bar on mobile (replaces bottom hero panel). */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function QrPageLayout({
  children,
  backHref,
  backLabel,
  eyebrow,
  title,
  subtitle,
}: QrPageLayoutProps) {
  const hasSubheader = Boolean(eyebrow || title || subtitle);

  return (
    <div
      className={`qr-page-root flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden${
        hasSubheader ? " qr-page-root--subheader" : ""
      }`}
    >
      <Header
        showCart={false}
        showBackToMenu
        backHref={backHref}
        backLabel={backLabel}
        variant="qr"
      />
      {hasSubheader ? (
        <div className="qr-page-subheader shrink-0">
          {eyebrow ? <span className="qr-eyebrow">{eyebrow}</span> : null}
          {title ? <h1 className="qr-title">{title}</h1> : null}
          {subtitle ? <p className="qr-lead qr-lead--subheader">{subtitle}</p> : null}
        </div>
      ) : null}
      <main className="qr-page-main flex min-h-0 w-full flex-1 flex-col">{children}</main>
    </div>
  );
}
