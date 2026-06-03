import Link from "next/link";

interface AdminDatabaseSetupProps {
  message?: string;
  databaseStatus?: "not_configured" | "error" | "connected";
}

export function AdminDatabaseSetup({
  message,
  databaseStatus = "not_configured",
}: AdminDatabaseSetupProps) {
  const isConnectionError = databaseStatus === "error";

  return (
    <div className="mt-lg rounded-2xl border border-secondary-container/40 bg-surface-container-low p-md sm:p-xl">
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary-container/25">
          <span className="material-symbols-outlined text-[28px] text-secondary">
            database
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-on-surface">
            {isConnectionError ? "Could not connect to database" : "Connect Supabase to load orders"}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            {isConnectionError
              ? (message ??
                "Supabase credentials are set but the server could not reach your database. Check the URL, service role key, and that you ran the SQL schema.")
              : "The admin dashboard reads orders from Supabase. Add your project API keys to a local `.env.local` file, then restart the dev server."}
          </p>

          {!isConnectionError && (
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-on-surface-variant">
              <li>
                Create a project at{" "}
                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-secondary hover:underline"
                >
                  supabase.com
                </a>
              </li>
              <li>
                In <strong>SQL Editor</strong>, run <code className="rounded bg-surface-container px-1 text-xs">supabase/schema.sql</code> then{" "}
                <code className="rounded bg-surface-container px-1 text-xs">supabase/seed.sql</code>
              </li>
              <li>
                Copy <strong>Project URL</strong>, <strong>anon key</strong>, and{" "}
                <strong>service_role key</strong> from Project Settings → API
              </li>
              <li>
                Paste them into <code className="rounded bg-surface-container px-1 text-xs">.env.local</code> in the project root
              </li>
              <li>
                Restart: <code className="rounded bg-surface-container px-1 text-xs">npm run dev</code>
              </li>
            </ol>
          )}

          <div className="mt-5 rounded-xl border border-surface-variant bg-surface-container-lowest p-md font-mono text-xs leading-relaxed text-on-surface-variant">
            <p className="font-sans text-xs font-semibold text-on-surface">.env.local</p>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">
{`NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...`}
            </pre>
          </div>

          <p className="mt-4 text-xs text-on-surface-variant">
            On Vercel, add the same variables under Project Settings → Environment Variables, then redeploy.
          </p>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary sm:w-auto"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Retry
            </button>
            <Link
              href="/api/health"
              target="_blank"
              className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border border-surface-variant px-4 py-2 text-sm font-semibold text-on-surface-variant hover:border-secondary-container hover:text-on-surface sm:w-auto"
            >
              Check /api/health
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
