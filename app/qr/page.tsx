import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import QRCode from "qrcode";
import { QrPageLayout } from "@/app/components/QrPageLayout";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
import { StaffTableQrPanel } from "@/app/components/StaffTableQrPanel";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";
import { ADMIN_DASHBOARD_PATH, MENU_PAGE_PATH, menuUrlFromOrigin } from "@/lib/menu-url";
import { getSiteOrigin } from "@/lib/site-url";
import { normalizeTableLetter } from "@/lib/table-session";

export const metadata: Metadata = {
  title: "Scan to Order — TableBite",
  description: "Generate table QR codes for TableBite ordering",
};

const steps = [
  {
    icon: "photo_camera",
    title: "Scan",
    description: "Each table has its own QR code with a unique letter or code.",
  },
  {
    icon: "restaurant_menu",
    title: "Browse",
    description: "The menu opens with your table letter shown at the top.",
  },
  {
    icon: "shopping_cart_checkout",
    title: "Order",
    description: "Add items, choose dine-in or pick-up, and pay with cash or GCash.",
  },
] as const;

interface QrPageProps {
  searchParams: Promise<{ view?: string; table?: string }>;
}

export default async function QrPage({ searchParams }: QrPageProps) {
  const params = await searchParams;
  const isStaff = params.view === "staff";
  const tableLetter = normalizeTableLetter(params.table) || "A";
  const origin = await getSiteOrigin();
  const menuUrl = menuUrlFromOrigin(origin, tableLetter);
  const qrSvg = await QRCode.toString(menuUrl, {
    type: "svg",
    margin: MENU_QR_MARGIN,
    width: MENU_QR_DISPLAY_WIDTH,
    color: MENU_QR_COLORS,
    errorCorrectionLevel: "M",
  });

  return (
    <QrPageLayout
      backHref={isStaff ? ADMIN_DASHBOARD_PATH : undefined}
      backLabel={isStaff ? "Admin dashboard" : undefined}
    >
      <div className="qr-page-shell">
        <section className="qr-panel-left">
          <div className="qr-panel-left-inner">
            <div className="qr-hero-block">
              <span className="qr-eyebrow">QR table ordering</span>
              <h1 className="qr-title">{isStaff ? "Generate table QR" : "Scan to order"}</h1>
              <p className="qr-lead">
                {isStaff
                  ? "Type a table letter and print or download its QR code. Customers scan to open the menu — no login required."
                  : "Ready to eat? Scan your table QR code to open the menu and order from your phone."}
              </p>
            </div>

            <ol className="qr-steps">
              {steps.map((step, index) => (
                <li key={step.title} className="qr-step">
                  <span className="qr-step-badge" aria-hidden>
                    {index + 1}
                  </span>
                  <div className="qr-step-body">
                    <div className="qr-step-heading">
                      <span className="material-symbols-outlined qr-step-icon">
                        {step.icon}
                      </span>
                      <h2 className="qr-step-title">{step.title}</h2>
                    </div>
                    <p className="qr-step-desc">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="qr-mobile-cta">
              <Link href={MENU_PAGE_PATH} className="qr-open-menu-btn">
                Open Digital Menu
              </Link>
            </div>
          </div>
        </section>

        <section className="qr-panel-right" aria-label="Table QR code">
          <div className="qr-panel-right-glow" aria-hidden />
          <div className="qr-panel-right-inner">
            <div className={isStaff ? "qr-card qr-card--staff" : "qr-card"}>
              {isStaff ? (
                <Suspense
                  fallback={
                    <LoadingBlock className="py-xl" message="Loading QR generator…" />
                  }
                >
                  <StaffTableQrPanel
                    initialTableLetter={tableLetter}
                    serverMenuUrl={menuUrl}
                    initialSvg={qrSvg}
                  />
                </Suspense>
              ) : (
                <>
                  <p className="qr-card-footer-sub px-md pt-md text-center">
                    Staff should use{" "}
                    <Link href="/qr?view=staff" className="font-semibold text-secondary">
                      /qr?view=staff
                    </Link>{" "}
                    to generate table QR codes.
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </QrPageLayout>
  );
}
