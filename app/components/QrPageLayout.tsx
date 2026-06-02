"use client";

import { Header } from "@/app/components/Header";

interface QrPageLayoutProps {
  children: React.ReactNode;
}

export function QrPageLayout({ children }: QrPageLayoutProps) {
  return (
    <div className="qr-page-root flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-background">
      <Header showCart={false} showBackToMenu />
      <main className="qr-page-main flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
