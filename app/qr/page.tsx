import type { Metadata } from "next";
import Link from "next/link";
import { MenuQrDisplay } from "@/app/components/MenuQrDisplay";
import { QrDownloadActions } from "@/app/components/QrDownloadActions";
import { QrPageLayout } from "@/app/components/QrPageLayout";
import { getMenuPageUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Scan to Order — TableBite",
  description: "Scan the QR code to open the TableBite menu",
};

const steps = [
  {
    icon: "photo_camera",
    title: "Scan",
    description:
      "Scan this code with your phone camera to access our digital interface.",
  },
  {
    icon: "restaurant_menu",
    title: "Browse",
    description:
      "Explore our curated selection of seasonal dishes and chef's specials.",
  },
  {
    icon: "shopping_cart_checkout",
    title: "Order",
    description:
      "Add items to your cart, confirm your table number, and place your order.",
  },
] as const;

const tableNumber = process.env.NEXT_PUBLIC_TABLE_NUMBER;

export default async function QrPage() {
  const menuUrl = await getMenuPageUrl();

  return (
    <QrPageLayout>
      <div className="qr-page-shell">
        <section className="qr-panel-left">
          <div className="qr-panel-left-inner">
            <div className="qr-hero-block">
              <span className="qr-eyebrow">QR table ordering</span>
              <h1 className="qr-title">Scan to order</h1>
              <p className="qr-lead">
                Ready to eat? Skip the wait and order directly from your smartphone
                in three simple steps.
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
              <Link href="/" className="qr-open-menu-btn">
                Open Digital Menu
              </Link>
            </div>
          </div>
        </section>

        <section className="qr-panel-right" aria-label="Menu QR code">
          <div className="qr-panel-right-glow" aria-hidden />
          <div className="qr-panel-right-inner">
            <div className="qr-card">
              <div className="qr-scan-pill">
                <span className="material-symbols-outlined qr-scan-pill-icon">
                  center_focus_strong
                </span>
                <span>Scan with camera</span>
              </div>

              <div className="qr-code-frame">
                <MenuQrDisplay fallbackMenuUrl={menuUrl} />
                <span className="qr-corner qr-corner-tl" aria-hidden />
                <span className="qr-corner qr-corner-tr" aria-hidden />
                <span className="qr-corner qr-corner-bl" aria-hidden />
                <span className="qr-corner qr-corner-br" aria-hidden />
              </div>

              <div className="qr-card-footer">
                <p className="qr-card-footer-title">Opens TableBite Menu</p>
                {tableNumber ? (
                  <p className="qr-card-footer-sub">Table No: {tableNumber}</p>
                ) : null}
              </div>

              <QrDownloadActions menuUrl={menuUrl} tableNumber={tableNumber} />
            </div>
          </div>
        </section>
      </div>
    </QrPageLayout>
  );
}
