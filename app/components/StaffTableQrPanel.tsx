"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { MenuQrDisplay } from "@/app/components/MenuQrDisplay";
import { QrDownloadActions } from "@/app/components/QrDownloadActions";
import { openAdminTableVisit } from "@/lib/api-admin";
import { menuUrlForTable, staffQrPath } from "@/lib/menu-url";
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
  const searchParams = useSearchParams();
  const [tableLetter, setTableLetter] = useState(
    normalizeTableLetter(initialTableLetter) || "A",
  );
  const [inputValue, setInputValue] = useState(tableLetter);
  const [inputError, setInputError] = useState<string | null>(null);
  const [menuUrl, setMenuUrl] = useState(serverMenuUrl);
  const [qrSvg, setQrSvg] = useState(initialSvg);
  const [generating, setGenerating] = useState(false);
  const [openingVisit, setOpeningVisit] = useState(false);
  const [visitMessage, setVisitMessage] = useState<string | null>(null);

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
    if (!fromUrl || fromUrl === tableLetter) return;
    refreshQr(fromUrl).catch(() => {
      /* keep existing svg */
    });
  }, [searchParams, tableLetter, refreshQr]);

  function updateQrFromInput() {
    if (!isValidTableLetterInput(inputValue)) {
      setInputError(
        `Enter 1–${TABLE_ID_MAX_LENGTH} letters or numbers (e.g. A, B, VIP, T1).`,
      );
      return;
    }

    setInputError(null);
    const normalized = normalizeTableLetter(inputValue)!;

    if (typeof window !== "undefined") {
      // Keep the URL in sync (use replaceState so we don't navigate away from /admin/qr).
      window.history.replaceState(null, "", staffQrPath(normalized));
    }

    refreshQr(normalized).catch(() => {
      /* handled above */
    });
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    updateQrFromInput();
  }

  return (
    <div className="qr-card-staff">
      <div className="qr-card-staff-hero">
        <p className="qr-table-badge">{formatTableLabel(tableLetter)}</p>

        <div className="qr-scan-pill">
          <span className="material-symbols-outlined qr-scan-pill-icon">center_focus_strong</span>
          <span>Scan with camera</span>
        </div>

        <div className="qr-code-spotlight">
          <div className="qr-code-frame">
            <MenuQrDisplay menuUrl={menuUrl} initialSvg={qrSvg} tableLetter={tableLetter} />
          </div>
        </div>

        <div className="qr-card-footer">
          <p className="qr-card-footer-sub">Scans start a new table visit at the restaurant</p>
        </div>
      </div>

      <section className="qr-card-staff-form w-full rounded-2xl border border-surface-variant bg-surface-container-low p-md">
        <h2 className="text-sm font-bold text-on-surface">Table letter</h2>
        <p className="mt-1 text-xs text-on-surface-variant">
          Type any table letter or code (up to {TABLE_ID_MAX_LENGTH} characters). QR codes open a
          short entry step, then the menu with a table session. After you complete an order, guests
          must scan again (or use the button below).
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
            type="button"
            disabled={generating}
            className="inline-flex min-h-11 w-full shrink-0 touch-manipulation items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-on-primary disabled:opacity-60 sm:w-auto"
            onClick={updateQrFromInput}
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

      <button
        type="button"
        disabled={openingVisit}
        className="w-full rounded-xl border border-secondary/40 bg-secondary-container/20 px-4 py-3 text-sm font-bold text-on-surface disabled:opacity-60"
        onClick={() => {
          setVisitMessage(null);
          setOpeningVisit(true);
          openAdminTableVisit(tableLetter)
            .then(() => {
              setVisitMessage(`${formatTableLabel(tableLetter)} is open for new guests to scan.`);
            })
            .catch((err: unknown) => {
              setVisitMessage(
                err instanceof Error ? err.message : "Could not open table visit.",
              );
            })
            .finally(() => setOpeningVisit(false));
        }}
      >
        {openingVisit ? "Opening…" : "Open table for new guests"}
      </button>
      {visitMessage ? (
        <p className="text-center text-xs text-on-surface-variant" role="status">
          {visitMessage}
        </p>
      ) : null}

      <QrDownloadActions menuUrl={menuUrl} tableLetter={tableLetter} />
    </div>
  );
}
