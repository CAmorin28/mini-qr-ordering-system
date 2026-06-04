import type { Metadata } from "next";
import { Suspense } from "react";
import { QrPageLayout } from "@/app/components/QrPageLayout";
import { StaffTableQrPanel } from "@/app/components/StaffTableQrPanel";
import { LoadingBlock } from "@/app/components/ui/LoadingBlock";
import { ADMIN_DASHBOARD_PATH } from "@/lib/menu-url";
import { loadStaffQrPanelProps } from "@/lib/staff-qr-props";

export const metadata: Metadata = {
  title: "Table QR codes — TableBite Admin",
  description: "Generate table QR codes for TableBite ordering",
};

interface AdminQrPageProps {
  searchParams: Promise<{ table?: string }>;
}

export default async function AdminQrPage({ searchParams }: AdminQrPageProps) {
  const params = await searchParams;
  const props = await loadStaffQrPanelProps(params.table);

  return (
    <QrPageLayout backHref={ADMIN_DASHBOARD_PATH} backLabel="Admin dashboard">
      <div className="qr-page-shell">
        <section className="qr-panel-left">
          <div className="qr-panel-left-inner">
            <div className="qr-hero-block">
              <span className="qr-eyebrow">QR table ordering</span>
              <h1 className="qr-title">Generate table QR</h1>
              <p className="qr-lead">
                Type a table letter and print or download its QR code. Customers scan to open
                the menu — no login required.
              </p>
            </div>
          </div>
        </section>

        <section className="qr-panel-right" aria-label="Table QR code">
          <div className="qr-panel-right-glow" aria-hidden />
          <div className="qr-panel-right-inner">
            <div className="qr-card qr-card--staff">
              <Suspense
                fallback={
                  <LoadingBlock className="py-xl" message="Loading QR generator…" />
                }
              >
                <StaffTableQrPanel {...props} />
              </Suspense>
            </div>
          </div>
        </section>
      </div>
    </QrPageLayout>
  );
}
