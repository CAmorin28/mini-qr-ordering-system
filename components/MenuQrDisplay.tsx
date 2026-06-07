"use client";

import {
  MENU_QR_DISPLAY_WIDTH,
} from "@/lib/shared/qr-code";

interface MenuQrDisplayProps {
  /** Absolute menu URL encoded in the QR (includes /menu/enter?table=…). */
  menuUrl: string;
  /** SVG to render — only changes when the parent explicitly updates the QR. */
  initialSvg: string;
  /** @deprecated Unused; kept for call-site compatibility. */
  tableLetter?: string;
}

export function MenuQrDisplay({ initialSvg }: MenuQrDisplayProps) {
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(initialSvg)}`;

  return (
    <div className="qr-code-display">
      {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG QR from qrcode */}
      <img
        src={dataUrl}
        alt="QR code linking to the TableBite menu"
        width={MENU_QR_DISPLAY_WIDTH}
        height={MENU_QR_DISPLAY_WIDTH}
        className="qr-code-image"
        decoding="sync"
      />
    </div>
  );
}
