import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QrPageLayout } from "@/app/components/QrPageLayout";
import { MENU_PAGE_PATH, staffQrPath } from "@/lib/menu-url";
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
  if (params.view === "staff") {
    redirect(staffQrPath(normalizeTableLetter(params.table) || undefined));
  }

  return (
    <QrPageLayout
      eyebrow="QR table ordering"
      title="Scan to order"
      subtitle="Ready to eat? Scan your table QR code to open the menu and order from your phone."
    >
      <div className="qr-page-shell qr-page-shell--guest">
        <section className="qr-panel-left">
          <div className="qr-panel-left-inner">
            <div className="qr-hero-block">
              <span className="qr-eyebrow">QR table ordering</span>
              <h1 className="qr-title">Scan to order</h1>
              <p className="qr-lead">
                Ready to eat? Scan your table QR code to open the menu and order from your
                phone.
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
            <div className="qr-card qr-card--guest">
              <div className="qr-guest-spotlight" aria-hidden>
                <span className="material-symbols-outlined qr-guest-spotlight-icon">
                  qr_code_2
                </span>
              </div>
              <p className="qr-card-footer-title">Your table QR</p>
              <p className="qr-card-footer-sub">
                Look for the QR code on your table tent or ask staff to point you to it.
              </p>
              <Link href={MENU_PAGE_PATH} className="qr-open-menu-btn qr-open-menu-btn--inline">
                Browse menu without QR
              </Link>
              <p className="qr-card-staff-hint">
                Staff: generate codes in{" "}
                <Link href={staffQrPath()} className="font-semibold text-secondary">
                  Table QR admin
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </QrPageLayout>
  );
}
