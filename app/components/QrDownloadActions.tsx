"use client";

import { useCallback, useState } from "react";
import QRCode from "qrcode";
import {
  getQrDownloadFilename,
  MENU_QR_COLORS,
  MENU_QR_DOWNLOAD_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";

interface QrDownloadActionsProps {
  menuUrl: string;
  tableNumber?: string | null;
}

type DownloadFormat = "png" | "svg";

const downloadOptions: {
  format: DownloadFormat;
  label: string;
  icon: string;
  variant: "primary" | "secondary";
}[] = [
  {
    format: "png",
    label: "PNG",
    icon: "download",
    variant: "primary",
  },
  {
    format: "svg",
    label: "SVG",
    icon: "print",
    variant: "secondary",
  },
];

async function saveFile(file: File, filename: string): Promise<void> {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        files: [file],
        title: "TableBite menu QR",
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function QrDownloadActions({
  menuUrl,
  tableNumber,
}: QrDownloadActionsProps) {
  const [busyFormat, setBusyFormat] = useState<DownloadFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = useCallback(
    async (format: DownloadFormat) => {
      setBusyFormat(format);
      setError(null);

      try {
        const filename = getQrDownloadFilename(format, tableNumber);
        const options = {
          margin: MENU_QR_MARGIN,
          width: MENU_QR_DOWNLOAD_WIDTH,
          color: MENU_QR_COLORS,
        };

        if (format === "png") {
          const dataUrl = await QRCode.toDataURL(menuUrl, options);
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          await saveFile(
            new File([blob], filename, { type: "image/png" }),
            filename,
          );
        } else {
          const svg = await QRCode.toString(menuUrl, {
            ...options,
            type: "svg",
          });
          const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
          await saveFile(
            new File([blob], filename, { type: "image/svg+xml" }),
            filename,
          );
        }
      } catch {
        setError("Could not download the QR code. Please try again.");
      } finally {
        setBusyFormat(null);
      }
    },
    [menuUrl, tableNumber],
  );

  return (
    <section
      className="qr-download-section"
      aria-labelledby="qr-download-heading"
    >
      <h2
        id="qr-download-heading"
        className="qr-download-title"
      >
        Download this QR code
      </h2>

      <div className="qr-download-actions">
        {downloadOptions.map((option) => {
          const isBusy = busyFormat === option.format;
          const isDisabled = busyFormat !== null;
          const isPrimary = option.variant === "primary";

          return (
            <button
              key={option.format}
              type="button"
              disabled={isDisabled}
              onClick={() => download(option.format)}
              className={
                isPrimary
                  ? "qr-download-btn qr-download-btn-primary"
                  : "qr-download-btn"
              }
            >
              <span
                className={`material-symbols-outlined text-[18px] ${isBusy ? "animate-spin" : ""}`}
                aria-hidden
              >
                {isBusy ? "progress_activity" : option.icon}
              </span>
              {isBusy ? "…" : `Download ${option.label}`}
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="qr-download-error" role="alert">
          {error}
        </p>
      ) : null}

      <p className="qr-download-hint">PNG for phones · SVG for print</p>
    </section>
  );
}
