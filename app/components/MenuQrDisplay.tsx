"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { menuUrlFromWindow } from "@/lib/menu-url";
import { shouldRefreshQrFromBrowser } from "@/lib/origin";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";

interface MenuQrDisplayProps {
  /** Server-rendered menu URL (encoded in initialSvg). */
  menuUrl: string;
  /** SVG from the server so the code is scannable before JS runs. */
  initialSvg: string;
}

async function renderMenuQr(menuUrl: string): Promise<string> {
  return QRCode.toString(menuUrl, {
    type: "svg",
    margin: MENU_QR_MARGIN,
    width: MENU_QR_DISPLAY_WIDTH,
    color: MENU_QR_COLORS,
  });
}

export function MenuQrDisplay({ menuUrl, initialSvg }: MenuQrDisplayProps) {
  const [qrSvg, setQrSvg] = useState(initialSvg);

  useEffect(() => {
    if (!shouldRefreshQrFromBrowser(menuUrl)) return;

    const targetUrl = menuUrlFromWindow() ?? menuUrl;
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
  }, [menuUrl]);

  return (
    <div
      className="qr-code-display"
      aria-label="QR code linking to the TableBite menu"
      dangerouslySetInnerHTML={{ __html: qrSvg }}
    />
  );
}
