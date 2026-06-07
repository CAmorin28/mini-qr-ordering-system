import type { ReactNode } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface GuestStatusScreenProps {
  icon?: string;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  loading?: boolean;
}

export function GuestStatusScreen({
  icon = "qr_code_scanner",
  title,
  children,
  action,
  loading = false,
}: GuestStatusScreenProps) {
  return (
    <div className="guest-status-screen customer-page-shell flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 flex-col overflow-hidden bg-background">
      <main className="customer-page-scroll guest-status-main mx-auto flex w-full min-w-0 flex-1 flex-col items-center justify-center">
        <div className="guest-status-panel">
          <div className="guest-status-icon-wrap" aria-hidden={loading}>
            {loading ? (
              <LoadingSpinner size="md" label="Loading" className="text-secondary" />
            ) : (
              <span className="material-symbols-outlined guest-status-icon">{icon}</span>
            )}
          </div>

          <div className="guest-status-copy">
            <h1 className="guest-status-title">{title}</h1>
            <div className="guest-status-message">{children}</div>
          </div>

          {action ? <div className="guest-status-action">{action}</div> : null}
        </div>
      </main>
    </div>
  );
}
