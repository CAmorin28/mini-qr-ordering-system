import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { QrPageLayout } from "@/components/QrPageLayout";
import { StaffTableQrPanel } from "@/components/StaffTableQrPanel";
import { LoadingBlock } from "@/components/ui/LoadingBlock";
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH } from "@/lib/shared/menu-url";
import { loadStaffQrPanelProps } from "@/lib/server/staff-qr-props";
import { getAdminSessionFromCookies } from "@/lib/server/admin-auth";

export const metadata: Metadata = {
  title: "Table QR codes — TableBite Admin",
  description: "Generate table QR codes for TableBite ordering",
};

interface AdminQrPageProps {
  searchParams: Promise<{ table?: string }>;
}

export default async function AdminQrPage({ searchParams }: AdminQrPageProps) {
  const params = await searchParams;
  const authenticated = await getAdminSessionFromCookies();
  if (!authenticated) redirect(ADMIN_LOGIN_PATH);

  const props = await loadStaffQrPanelProps(params.table);

  return (
    <QrPageLayout
      backHref={ADMIN_DASHBOARD_PATH}
      backLabel="Admin dashboard"
      eyebrow="Staff · Table QR"
      title="Generate table QR"
    >
      <div className="qr-page-shell qr-page-shell--staff">
        <section className="qr-panel-left qr-panel-left--desktop-only">
          <div className="qr-panel-left-inner">
            <div className="qr-hero-block">
              <span className="qr-eyebrow">Staff · Table QR</span>
              <h1 className="qr-title">Generate table QR</h1>
              <p className="qr-lead qr-lead--staff">
                Pick a table letter, then print or share the code. Guests scan to order — no app
                install needed.
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
