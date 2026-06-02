export const MENU_QR_COLORS = {
  dark: "#05051b",
  light: "#ffffff",
} as const;

export const MENU_QR_MARGIN = 1;

/** Size for on-screen SVG in the QR page */
export const MENU_QR_DISPLAY_WIDTH = 600;

/** Higher resolution for downloaded files */
export const MENU_QR_DOWNLOAD_WIDTH = 1200;

export function getQrDownloadFilename(
  extension: "png" | "svg",
  tableNumber?: string | null,
): string {
  const base = tableNumber
    ? `tablebite-table-${tableNumber}-qr`
    : "tablebite-menu-qr";
  return `${base}.${extension}`;
}
