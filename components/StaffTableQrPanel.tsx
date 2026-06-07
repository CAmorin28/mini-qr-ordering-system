"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import QRCode from "qrcode";
import { MenuQrDisplay } from "@/components/MenuQrDisplay";
import { QrDownloadActions } from "@/components/QrDownloadActions";
import {
  formatAdminSessionStatusMessage,
  readPersistedAdminQrPanel,
  shouldRestoreAdminQrFromStorage,
  writePersistedAdminQrPanel,
  type AdminTableSessionStatus,
} from "@/lib/client/admin-qr-persistence";
import { fetchAdminTableVisitSummary, openAdminTableVisit, terminateAdminTableSession } from "@/lib/client/api-admin";
import { menuUrlForTable } from "@/lib/shared/menu-url";
import { isLoopbackUrl } from "@/lib/shared/qr-origin";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/shared/qr-code";
import {
  TABLE_ID_MAX_LENGTH,
  formatTableLabel,
  isValidTableLetterInput,
  normalizeTableLetter,
} from "@/lib/shared/table-session";

interface StaffTableQrPanelProps {
  initialTableLetter: string;
  serverMenuUrl: string;
  initialSvg: string;
  scannableOrigin: string;
}

const STATUS_POLL_MS = 10_000;

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
  scannableOrigin,
}: StaffTableQrPanelProps) {
  const restoredRef = useRef(false);
  const manualVisitMessageRef = useRef<string | null>(null);

  const [tableLetter, setTableLetter] = useState(
    normalizeTableLetter(initialTableLetter) || "A",
  );
  const [inputValue, setInputValue] = useState(tableLetter);
  const [inputError, setInputError] = useState<string | null>(null);
  const [menuUrl, setMenuUrl] = useState(serverMenuUrl);
  const [qrSvg, setQrSvg] = useState(initialSvg);
  const [generating, setGenerating] = useState(false);
  const [openingVisit, setOpeningVisit] = useState(false);
  const [terminatingSession, setTerminatingSession] = useState(false);
  const [visitMessage, setVisitMessage] = useState<string | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AdminTableSessionStatus | null>(null);

  const persistPanel = useCallback(
    (
      next: {
        tableLetter: string;
        menuUrl: string;
        qrSvg: string;
        visitMessage: string | null;
        sessionStatus: AdminTableSessionStatus | null;
      },
    ) => {
      writePersistedAdminQrPanel(next);
    },
    [],
  );

  useLayoutEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const persisted = readPersistedAdminQrPanel();
    if (!persisted) return;

    const urlTable = normalizeTableLetter(initialTableLetter);
    const restoreFullPanel = shouldRestoreAdminQrFromStorage();
    const sameTableAsUrl = Boolean(urlTable && persisted.tableLetter === urlTable);

    if (restoreFullPanel || sameTableAsUrl) {
      if (restoreFullPanel) {
        const letter = normalizeTableLetter(persisted.tableLetter) || "A";
        setTableLetter(letter);
        setInputValue(letter);
        setMenuUrl(persisted.menuUrl);
        setQrSvg(persisted.qrSvg);
      }
      setSessionStatus(persisted.sessionStatus);
      if (persisted.visitMessage) {
        manualVisitMessageRef.current = persisted.visitMessage;
        setVisitMessage(persisted.visitMessage);
      } else if (persisted.sessionStatus) {
        const letter = restoreFullPanel
          ? persisted.tableLetter
          : (urlTable ?? persisted.tableLetter);
        setVisitMessage(formatAdminSessionStatusMessage(letter, persisted.sessionStatus));
      }
    }
  }, [initialTableLetter]);

  const refreshSessionStatus = useCallback(async (letter: string) => {
    const normalized = normalizeTableLetter(letter);
    if (!normalized) return;

    const summary = await fetchAdminTableVisitSummary(normalized);
    if (!summary) return;

    const status: AdminTableSessionStatus = {
      visitOpen: summary.visitOpen,
      sessionOccupied: summary.sessionOccupied,
      hasActiveOrders: summary.hasActiveOrders,
    };

    setSessionStatus(status);

    if (!summary.visitOpen) {
      manualVisitMessageRef.current = null;
    }

    const statusMessage = formatAdminSessionStatusMessage(normalized, status);
    if (!manualVisitMessageRef.current) {
      setVisitMessage(statusMessage);
    }

    persistPanel({
      tableLetter: normalized,
      menuUrl,
      qrSvg,
      visitMessage: manualVisitMessageRef.current ?? statusMessage,
      sessionStatus: status,
    });
  }, [menuUrl, persistPanel, qrSvg]);

  useEffect(() => {
    void refreshSessionStatus(tableLetter);
    const timer = window.setInterval(() => {
      void refreshSessionStatus(tableLetter);
    }, STATUS_POLL_MS);
    return () => window.clearInterval(timer);
  }, [tableLetter, refreshSessionStatus]);

  useEffect(() => {
    persistPanel({
      tableLetter,
      menuUrl,
      qrSvg,
      visitMessage,
      sessionStatus,
    });
  }, [tableLetter, menuUrl, qrSvg, visitMessage, sessionStatus, persistPanel]);

  const refreshQr = useCallback(
    async (letter: string) => {
      const normalized = normalizeTableLetter(letter);
      if (!normalized) return;

      setGenerating(true);
      try {
        const url = menuUrlForTable(normalized, scannableOrigin);
        const svg = await renderQrSvg(url);
        setMenuUrl(url);
        setQrSvg(svg);
        setTableLetter(normalized);
        setInputValue(normalized);
        manualVisitMessageRef.current = null;
        persistPanel({
          tableLetter: normalized,
          menuUrl: url,
          qrSvg: svg,
          visitMessage,
          sessionStatus,
        });
      } finally {
        setGenerating(false);
      }
    },
    [scannableOrigin, visitMessage, sessionStatus, persistPanel],
  );

  useEffect(() => {
    if (!isLoopbackUrl(menuUrl)) return;

    const url = menuUrlForTable(tableLetter, scannableOrigin);
    if (url === menuUrl) return;

    setMenuUrl(url);
    void renderQrSvg(url).then(setQrSvg);
  }, [scannableOrigin, menuUrl, tableLetter]);

  function updateQrFromInput() {
    if (!isValidTableLetterInput(inputValue)) {
      setInputError("Enter one table letter (A–Z).");
      return;
    }

    setInputError(null);
    const normalized = normalizeTableLetter(inputValue)!;

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
          Enter one letter (A–Z). QR codes open a short entry step, then the menu with a table
          session. After you complete an order, guests must scan again (or use the button below).
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
              setInputValue(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1));
              setInputError(null);
            }}
            placeholder="e.g. A"
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
          <button
            type="button"
            disabled={terminatingSession || !sessionStatus?.sessionOccupied}
            className="inline-flex min-h-11 w-full shrink-0 touch-manipulation items-center justify-center rounded-xl border border-error bg-error px-4 py-2.5 text-sm font-bold text-on-primary shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-60 sm:w-auto"
            onClick={() => {
              setTerminatingSession(true);
              terminateAdminTableSession(tableLetter)
                .then(() => {
                  const message = `${formatTableLabel(tableLetter)} session terminated — guest must scan the QR again.`;
                  manualVisitMessageRef.current = message;
                  setVisitMessage(message);
                  return refreshSessionStatus(tableLetter);
                })
                .catch((err: unknown) => {
                  manualVisitMessageRef.current = null;
                  setVisitMessage(
                    err instanceof Error ? err.message : "Could not terminate table session.",
                  );
                })
                .finally(() => setTerminatingSession(false));
            }}
          >
            {terminatingSession ? "Terminating…" : "Terminate session"}
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
          setOpeningVisit(true);
          openAdminTableVisit(tableLetter)
            .then(() => {
              const message = `${formatTableLabel(tableLetter)} is open for new guests to scan.`;
              manualVisitMessageRef.current = message;
              setVisitMessage(message);
              return refreshSessionStatus(tableLetter);
            })
            .catch((err: unknown) => {
              manualVisitMessageRef.current = null;
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

      <QrDownloadActions
        menuUrl={menuUrl}
        tableLetter={tableLetter}
        scannableOrigin={scannableOrigin}
      />
    </div>
  );
}
