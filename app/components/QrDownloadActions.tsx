"use client";

import { useCallback, useState } from "react";
import QRCode from "qrcode";
import { menuUrlFromWindow } from "@/lib/menu-url";
import { shouldRefreshQrFromBrowser } from "@/lib/origin";
import {
  getQrDownloadFilename,
  MENU_QR_COLORS,
  MENU_QR_DOWNLOAD_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";

interface QrDownloadActionsProps {
  menuUrl: string;
  tableLetter?: string | null;
}

type SaveResult = "downloaded" | "shared" | "opened" | "cancelled";

const qrRenderOptions = {
  margin: MENU_QR_MARGIN,
  width: MENU_QR_DOWNLOAD_WIDTH,
  color: MENU_QR_COLORS,
  errorCorrectionLevel: "M" as const,
};

function isTouchMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)) {
    return true;
  }
  return (
    navigator.maxTouchPoints > 0 &&
    window.matchMedia("(pointer: coarse)").matches
  );
}

async function tryShareFile(file: File): Promise<"shared" | "cancelled" | "failed"> {
  if (
    typeof navigator.share !== "function" ||
    typeof navigator.canShare !== "function" ||
    !navigator.canShare({ files: [file] })
  ) {
    return "failed";
  }

  try {
    await navigator.share({
      files: [file],
      title: "TableBite menu QR",
    });
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    return "failed";
  }
}

function downloadWithAnchor(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openBlobInNewTab(blob: Blob): boolean {
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, "_blank", "noopener,noreferrer");
  if (!tab) {
    URL.revokeObjectURL(url);
    return false;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return true;
}

async function saveQrFile(file: File): Promise<SaveResult> {
  if (isTouchMobileDevice()) {
    const shareResult = await tryShareFile(file);
    if (shareResult === "shared") return "shared";
    if (shareResult === "cancelled") return "cancelled";

    if (openBlobInNewTab(file)) {
      return "opened";
    }
  }

  downloadWithAnchor(file, file.name);
  return "downloaded";
}

async function createPngFile(menuUrl: string, filename: string): Promise<File> {
  const canvas = document.createElement("canvas");
  await QRCode.toCanvas(canvas, menuUrl, qrRenderOptions);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("PNG export failed")),
      "image/png",
    );
  });

  return new File([blob], filename, { type: "image/png" });
}

export function QrDownloadActions({
  menuUrl,
  tableLetter,
}: QrDownloadActionsProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHint, setSuccessHint] = useState<string | null>(null);

  const downloadPng = useCallback(async () => {
    setBusy(true);
    setError(null);
    setSuccessHint(null);

    try {
      const letter = tableLetter ?? undefined;
      const targetMenuUrl = shouldRefreshQrFromBrowser(menuUrl)
        ? (menuUrlFromWindow(letter) ?? menuUrl)
        : menuUrl;
      const filename = getQrDownloadFilename(letter);
      const file = await createPngFile(targetMenuUrl, filename);
      const result = await saveQrFile(file);

      if (result === "cancelled") {
        return;
      }

      if (result === "opened") {
        setSuccessHint(
          "QR opened in a new tab — tap and hold the image, then save to Photos or Files.",
        );
        return;
      }

      if (result === "shared") {
        setSuccessHint("Use Save image or Save to Files in the share menu.");
        return;
      }

      if (result === "downloaded" && isTouchMobileDevice()) {
        setSuccessHint("If the file did not save, try again and allow downloads.");
      }
    } catch {
      setError(
        isTouchMobileDevice()
          ? "Could not save the QR code. Allow pop-ups and try again, or use a different browser."
          : "Could not download the QR code. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }, [menuUrl, tableLetter]);

  return (
    <section
      className="qr-download-section"
      aria-labelledby="qr-download-heading"
    >
      <h2 id="qr-download-heading" className="qr-download-title">
        Download this QR code
      </h2>

      <div className="qr-download-actions">
        <button
          type="button"
          disabled={busy}
          onClick={() => downloadPng()}
          className="qr-download-btn qr-download-btn-primary"
        >
          <span
            className={`material-symbols-outlined text-[18px] ${busy ? "animate-spin" : ""}`}
            aria-hidden
          >
            {busy ? "progress_activity" : "download"}
          </span>
          {busy ? "Preparing…" : "Download PNG"}
        </button>
      </div>

      {error ? (
        <p className="qr-download-error" role="alert">
          {error}
        </p>
      ) : null}

      {successHint ? (
        <p className="qr-download-success" role="status">
          {successHint}
        </p>
      ) : null}

      <p className="qr-download-hint">
        Works on phone and computer · High-resolution PNG for print and screens
      </p>
    </section>
  );
}
