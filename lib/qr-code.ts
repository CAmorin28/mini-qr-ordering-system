export const MENU_QR_COLORS = {
  dark: "#05051b",
  light: "#ffffff",
} as const;

export const MENU_QR_MARGIN = 2;

/** Size for on-screen SVG in the QR page */
export const MENU_QR_DISPLAY_WIDTH = 600;

/** Higher resolution for downloaded files */
export const MENU_QR_DOWNLOAD_WIDTH = 1200;

export function getQrDownloadFilename(
  extension: "png" | "svg",
  tableLetter?: string | null,
): string {
  const base = tableLetter
    ? `tablebite-table-${tableLetter.toUpperCase()}-qr`
    : "tablebite-menu-qr";
  return `${base}.${extension}`;
}
