import type { Metadata } from "next";
import QRCode from "qrcode";
import { QrPageLayout } from "@/app/components/QrPageLayout";
import { TableBiteBrand } from "@/app/components/TableBiteBrand";
import { getMenuPageUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Scan to Order — TableBite",
  description: "Scan the QR code to open the TableBite menu",
};

const steps = [
  { icon: "qr_code_scanner", label: "Scan this code with your phone camera" },
  { icon: "menu_book", label: "Browse our full menu" },
  { icon: "shopping_cart", label: "Add items and place your order" },
];

export default async function QrPage() {
  const menuUrl = await getMenuPageUrl();
  const qrSvg = await QRCode.toString(menuUrl, {
    type: "svg",
    margin: 1,
    width: 600,
    color: {
      dark: "#05051b",
      light: "#ffffff",
    },
  });

  return (
    <QrPageLayout>
      <div className="qr-page-shell border border-surface-variant bg-surface-container-lowest shadow-[0px_12px_40px_rgba(29,29,53,0.1)]">
        <section className="qr-panel-left relative bg-primary text-on-primary">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-secondary-container/20 blur-2xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-secondary/15 blur-3xl"
            aria-hidden
          />

          <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center gap-[clamp(1rem,2.5vh,2rem)]">
            <div>
              <TableBiteBrand variant="on-dark" size="xl" />
              <p className="qr-tagline mt-2 font-medium text-secondary-container">
                QR table ordering
              </p>
              <div className="mt-[clamp(0.75rem,2vh,1.5rem)] h-1.5 w-20 rounded-full bg-secondary-container" />
            </div>

            <div>
              <h1 className="qr-title font-bold">Scan to order</h1>
              <p className="qr-lead mt-[clamp(0.5rem,1.5vh,1rem)] text-on-primary/90">
                Point your camera at the code to open our menu and start ordering
                from your phone.
              </p>
            </div>

            <ol className="space-y-[clamp(0.75rem,2vh,1.25rem)]">
              {steps.map((step, index) => (
                <li key={step.label} className="flex w-full items-start gap-3 md:gap-4">
                  <span className="qr-step-badge flex shrink-0 items-center justify-center rounded-full bg-secondary-container font-bold text-on-secondary-container">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 items-start gap-2 md:gap-3">
                    <span
                      className={`material-symbols-outlined qr-step-icon shrink-0 text-secondary-container`}
                    >
                      {step.icon}
                    </span>
                    <span className="qr-step-text font-medium">{step.label}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <p className="qr-footer relative z-10 hidden shrink-0 pt-4 text-on-primary/75 md:block">
            Place this screen or a printed copy on your table so guests can order
            from their phones.
          </p>
        </section>

        <article className="qr-panel-right relative bg-surface-container-low">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(252,138,64,0.1),transparent_60%)]"
            aria-hidden
          />

          <div className="relative z-10 flex h-full min-h-0 w-full flex-col">
            <header className="qr-right-header">
              <TableBiteBrand size="lg" className="qr-right-brand" />
              <p className="qr-right-subtitle">Menu QR Code</p>
              <span className="qr-scan-badge inline-flex items-center rounded-full border border-secondary-container/40 bg-secondary-container/15 font-semibold text-secondary">
                <span className="material-symbols-outlined">photo_camera</span>
                Scan with your camera
              </span>
            </header>

            <div className="qr-right-body flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.5rem,1.5vh,1rem)] text-center">
              <div
                className="qr-code-display shrink rounded-2xl border-2 border-surface-variant bg-surface-container-lowest p-[clamp(0.5rem,1.5vw,1.5rem)] shadow-[0px_8px_32px_rgba(29,29,53,0.08)]"
                aria-label="QR code linking to the TableBite menu"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />

              <p className="shrink-0 text-base font-semibold text-on-surface lg:text-lg">
                Opens TableBite Menu
              </p>
            </div>
          </div>

          <p className="qr-footer relative z-10 mt-2 shrink-0 text-center text-on-surface-variant md:hidden">
            Place this code on your table so guests can order from their phones.
          </p>
        </article>
      </div>
    </QrPageLayout>
  );
}
