"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { menuUrlFromWindow } from "@/lib/menu-url";
import {
  MENU_QR_COLORS,
  MENU_QR_DISPLAY_WIDTH,
  MENU_QR_MARGIN,
} from "@/lib/qr-code";

interface MenuQrDisplayProps {
  /** Server fallback before hydration (e.g. SSR). */
  fallbackMenuUrl: string;
}

export function MenuQrDisplay({ fallbackMenuUrl }: MenuQrDisplayProps) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  useEffect(() => {
    const menuUrl = menuUrlFromWindow() ?? fallbackMenuUrl;

    let cancelled = false;
    QRCode.toString(menuUrl, {
      type: "svg",
      margin: MENU_QR_MARGIN,
      width: MENU_QR_DISPLAY_WIDTH,
      color: MENU_QR_COLORS,
    })
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {
        if (!cancelled) setQrSvg(null);
      });

    return () => {
      cancelled = true;
    };
  }, [fallbackMenuUrl]);

  if (!qrSvg) {
    return (
      <div
        className="qr-code-display qr-code-display-loading"
        aria-busy="true"
        aria-label="Loading QR code for the TableBite menu"
      />
    );
  }

  return (
    <div
      className="qr-code-display"
      aria-label="QR code linking to the TableBite menu"
      dangerouslySetInnerHTML={{ __html: qrSvg }}
    />
  );
}
