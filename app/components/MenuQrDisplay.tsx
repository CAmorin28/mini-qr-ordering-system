"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { menuUrlForTable, menuUrlFromWindow } from "@/lib/menu-url";
import { shouldRefreshQrFromBrowser } from "@/lib/origin";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";

interface MenuQrDisplayProps {
  /** Absolute menu URL encoded in the QR (includes /menu?table=…). */
  menuUrl: string;
  /** SVG from the server so the code is scannable before JS runs. */
  initialSvg: string;
  /** Table letter for LAN / mobile origin refresh. */
  tableLetter?: string;
}

async function renderMenuQr(menuUrl: string): Promise<string> {
  return QRCode.toString(menuUrl, {
    type: "svg",
    margin: MENU_QR_MARGIN,
    width: MENU_QR_DISPLAY_WIDTH,
    color: MENU_QR_COLORS,
    errorCorrectionLevel: "M",
  });
}

export function MenuQrDisplay({ menuUrl, initialSvg, tableLetter }: MenuQrDisplayProps) {
  const [qrSvg, setQrSvg] = useState(initialSvg);

  useEffect(() => {
    setQrSvg(initialSvg);
  }, [initialSvg, menuUrl]);

  useEffect(() => {
    if (!shouldRefreshQrFromBrowser(menuUrl)) return;

    const targetUrl =
      menuUrlFromWindow(tableLetter) ?? menuUrlForTable(menuUrl, tableLetter ?? "");
    if (targetUrl === menuUrl) return;

    let cancelled = false;
    renderMenuQr(targetUrl)
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        /* keep server SVG */
      });

    return () => {
      cancelled = true;
    };
  }, [menuUrl, tableLetter]);

  return (
    <div
      className="qr-code-display"
      aria-label="QR code linking to the TableBite menu"
      dangerouslySetInnerHTML={{ __html: qrSvg }}
    />
  );
}
