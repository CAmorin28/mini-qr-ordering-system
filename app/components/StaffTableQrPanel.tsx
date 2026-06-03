"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { MenuQrDisplay } from "@/app/components/MenuQrDisplay";
import { QrDownloadActions } from "@/app/components/QrDownloadActions";
import { ADMIN_DASHBOARD_PATH, menuUrlForTable, staffQrPath } from "@/lib/menu-url";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";
import {
  TABLE_ID_MAX_LENGTH,
  formatTableLabel,
  isValidTableLetterInput,
  normalizeTableLetter,
} from "@/lib/table-session";

interface StaffTableQrPanelProps {
  initialTableLetter: string;
  serverMenuUrl: string;
  initialSvg: string;
}

async function renderQrSvg(menuUrl: string): Promise<string> {
  return QRCode.toString(menuUrl, {
    type: "svg",
    margin: MENU_QR_MARGIN,
    width: MENU_QR_DISPLAY_WIDTH,
    color: MENU_QR_COLORS,
    errorCorrectionLevel: "M",
  });
}

export function StaffTableQrPanel({
  initialTableLetter,
  serverMenuUrl,
  initialSvg,
}: StaffTableQrPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tableLetter, setTableLetter] = useState(
    normalizeTableLetter(initialTableLetter) || "A",
  );
  const [inputValue, setInputValue] = useState(tableLetter);
  const [inputError, setInputError] = useState<string | null>(null);
  const [menuUrl, setMenuUrl] = useState(serverMenuUrl);
  const [qrSvg, setQrSvg] = useState(initialSvg);
  const [generating, setGenerating] = useState(false);

  const refreshQr = useCallback(
    async (letter: string) => {
      const normalized = normalizeTableLetter(letter);
      if (!normalized) return;

      setGenerating(true);
      try {
        const url = menuUrlForTable(serverMenuUrl, normalized);
        const svg = await renderQrSvg(url);
        setMenuUrl(url);
        setQrSvg(svg);
        setTableLetter(normalized);
        setInputValue(normalized);
      } finally {
        setGenerating(false);
      }
    },
    [serverMenuUrl],
  );

  useEffect(() => {
    const fromUrl = normalizeTableLetter(searchParams.get("table"));
    const letter = fromUrl || normalizeTableLetter(initialTableLetter) || "A";
    refreshQr(letter).catch(() => {
      /* keep existing svg */
    });
  }, [searchParams, initialTableLetter, refreshQr]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!isValidTableLetterInput(inputValue)) {
      setInputError(
        `Enter 1–${TABLE_ID_MAX_LENGTH} letters or numbers (e.g. A, B, VIP, T1).`,
      );
      return;
    }
    setInputError(null);
    const normalized = normalizeTableLetter(inputValue)!;
    router.replace(staffQrPath(normalized));
    refreshQr(normalized).catch(() => {
      /* handled above */
    });
  }

  return (
    <div className="qr-card-staff">
      <section className="qr-card-staff-form mb-md w-full rounded-2xl border border-surface-variant bg-surface-container-low p-md">
        <h2 className="text-sm font-bold text-on-surface">Table letter</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          Type any table letter or code (up to {TABLE_ID_MAX_LENGTH} characters). Each value
          generates a unique QR that opens the menu for that table session.
        </p>
        <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="table-letter-input">
            Table letter
          </label>
          <input
            id="table-letter-input"
            type="text"
            inputMode="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={TABLE_ID_MAX_LENGTH}
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value.toUpperCase());
              setInputError(null);
            }}
            placeholder="e.g. A, VIP, T1"
            className="checkout-input w-full uppercase sm:max-w-[10rem]"
          />
          <button
            type="submit"
            disabled={generating}
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60"
          >
            {generating ? "Updating…" : "Update QR"}
          </button>
        </form>
        {inputError ? (
          <p className="mt-2 text-xs text-error" role="alert">
            {inputError}
          </p>
        ) : null}
      </section>

      <div className="qr-scan-pill">
        <span className="material-symbols-outlined qr-scan-pill-icon">center_focus_strong</span>
        <span>Scan with camera</span>
      </div>

      <div className="qr-code-frame">
        <MenuQrDisplay menuUrl={menuUrl} initialSvg={qrSvg} tableLetter={tableLetter} />
      </div>

      <div className="qr-card-footer">
        <p className="qr-card-footer-title">{formatTableLabel(tableLetter)}</p>
        <p className="qr-card-footer-sub">Scans open the menu page directly</p>
      </div>

      <QrDownloadActions menuUrl={menuUrl} tableLetter={tableLetter} />

      <Link href={ADMIN_DASHBOARD_PATH} className="qr-back-admin-btn">
        <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
        Back to admin dashboard
      </Link>
    </div>
  );
}
