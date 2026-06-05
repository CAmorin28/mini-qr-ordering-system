import { tableLetterFromSearch } from "@/lib/menu-url";
import { normalizeTableLetter } from "@/lib/table-session";

const STORAGE_KEY = "tablebite_admin_qr_panel";

export interface PersistedAdminQrPanel {
  tableLetter: string;
  menuUrl: string;
  qrSvg: string;
  visitMessage: string | null;
}

/** True when the page URL does not specify a table (restore last panel instead of server default). */
export function shouldRestoreAdminQrFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  return !tableLetterFromSearch(window.location.search);
}

export function readPersistedAdminQrPanel(): PersistedAdminQrPanel | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedAdminQrPanel;
    const tableLetter = normalizeTableLetter(parsed.tableLetter);
    if (!tableLetter || typeof parsed.menuUrl !== "string" || typeof parsed.qrSvg !== "string") {
      return null;
    }

    return {
      tableLetter,
      menuUrl: parsed.menuUrl,
      qrSvg: parsed.qrSvg,
      visitMessage:
        typeof parsed.visitMessage === "string" ? parsed.visitMessage : null,
    };
  } catch {
    return null;
  }
}

export function writePersistedAdminQrPanel(data: PersistedAdminQrPanel): void {
  if (typeof window === "undefined") return;

  const tableLetter = normalizeTableLetter(data.tableLetter);
  if (!tableLetter || !data.menuUrl || !data.qrSvg) return;

  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tableLetter,
        menuUrl: data.menuUrl,
        qrSvg: data.qrSvg,
        visitMessage: data.visitMessage,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}
