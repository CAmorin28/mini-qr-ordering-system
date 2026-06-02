"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TableBiteBrand } from "@/app/components/TableBiteBrand";
import { adminSignIn, fetchAdminSession } from "@/lib/api-admin";
import { ADMIN_DASHBOARD_PATH, MENU_PAGE_PATH } from "@/lib/menu-url";

const FEATURES = [
  { icon: "receipt_long", text: "View all recent orders" },
  { icon: "payments", text: "Update payment status" },
  { icon: "task_alt", text: "Confirm or adjust order status" },
] as const;

export function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetchAdminSession()
      .then((session) => {
        if (session.authenticated) {
          router.replace(ADMIN_DASHBOARD_PATH);
        }
      })
      .catch(() => {
        /* stay on login */
      })
      .finally(() => setCheckingSession(false));
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await adminSignIn(username.trim(), password);
      router.replace(ADMIN_DASHBOARD_PATH);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="admin-login-page flex items-center justify-center">
        <div className="payment-spinner" aria-hidden />
        <span className="sr-only">Loading…</span>
      </div>
    );
  }

  return (
    <div className="admin-login-page">
      <aside className="admin-login-hero relative">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-secondary-container/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-72 w-72 rounded-full bg-secondary-container/15 blur-3xl" aria-hidden />

        <div className="relative z-10 w-full shrink-0">
          <TableBiteBrand variant="on-dark" size="lg" />
        </div>

        <div className="admin-login-hero-inner relative z-10 w-full shrink-0">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-on-primary/60">
            Staff portal
          </p>
          <h1 className="admin-login-hero-title mt-3 text-2xl font-bold leading-snug tracking-tight text-on-primary sm:text-3xl lg:text-4xl">
            Manage orders &amp; payments in one place
          </h1>
          <p className="admin-login-hero-lead mt-4 text-sm text-on-primary/75 sm:text-base">
            Sign in with your admin account to view incoming orders and update payment
            status.
          </p>

          <ul className="mt-8 hidden space-y-4 lg:block">
            {FEATURES.map((item) => (
              <li key={item.icon} className="flex items-center gap-3 text-sm text-on-primary/90">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-on-primary/10">
                  <span className="material-symbols-outlined text-[20px] text-secondary-container">
                    {item.icon}
                  </span>
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-on-primary/50">TableBite · Admin access only</p>
      </aside>

      <div className="admin-login-main">
        <div className="admin-login-form-wrap">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="material-symbols-outlined text-[32px] text-secondary-container">
              admin_panel_settings
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                TableBite
              </p>
              <p className="text-lg font-bold text-on-surface">Admin sign in</p>
            </div>
          </div>

          <div className="admin-login-card">
            <span className="material-symbols-outlined text-[40px] text-secondary-container">
              lock
            </span>
            <h2 className="mt-3 text-2xl font-bold text-on-surface">Welcome back</h2>
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              Enter your credentials to open the dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label htmlFor="admin-username" className="text-sm font-semibold text-on-surface">
                  Username
                </label>
                <div className="admin-login-field mt-2">
                  <span className="admin-login-field-icon material-symbols-outlined">person</span>
                  <input
                    id="admin-username"
                    type="text"
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="checkout-input !pl-11"
                    placeholder="Username"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="admin-password" className="text-sm font-semibold text-on-surface">
                  Password
                </label>
                <div className="admin-login-field mt-2">
                  <span className="admin-login-field-icon material-symbols-outlined">key</span>
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="checkout-input !pl-11 !pr-12"
                    placeholder="Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="admin-login-toggle"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div
                  className="flex items-start gap-2 rounded-xl bg-error-container/80 px-3 py-2.5 text-sm text-error"
                  role="alert"
                >
                  <span className="material-symbols-outlined shrink-0 text-[20px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !username.trim() || !password}
                className="flex w-full min-h-12 items-center justify-center gap-2 rounded-xl bg-secondary-container px-lg py-3 text-sm font-bold text-on-secondary-container shadow-sm transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="payment-spinner !h-5 !w-5 !border-2" aria-hidden />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <Link
            href={MENU_PAGE_PATH}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-secondary transition-colors hover:text-on-secondary-container"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            Back to customer menu
          </Link>
        </div>
      </div>
    </div>
  );
}
