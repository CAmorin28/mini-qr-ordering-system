import { tableLetterFromSearch } from "@/lib/menu-url";
import { normalizeTableLetter } from "@/lib/table-session";

const STORAGE_KEY = "tablebite_admin_qr_panel";

export interface AdminTableSessionStatus {
  visitOpen: boolean;
  sessionOccupied: boolean;
  hasActiveOrders: boolean;
}

export interface PersistedAdminQrPanel {
  tableLetter: string;
  menuUrl: string;
  qrSvg: string;
  visitMessage: string | null;
  sessionStatus: AdminTableSessionStatus | null;
}

function readStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** True when the page URL does not specify a table (restore last panel instead of server default). */
export function shouldRestoreAdminQrFromStorage(): boolean {
  if (typeof window === "undefined") return false;
  return !tableLetterFromSearch(window.location.search);
}

export function readPersistedAdminQrPanel(): PersistedAdminQrPanel | null {
  const storage = readStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedAdminQrPanel;
    const tableLetter = normalizeTableLetter(parsed.tableLetter);
    if (!tableLetter || typeof parsed.menuUrl !== "string" || typeof parsed.qrSvg !== "string") {
      return null;
    }

    const sessionStatus =
      parsed.sessionStatus &&
      typeof parsed.sessionStatus.visitOpen === "boolean" &&
      typeof parsed.sessionStatus.sessionOccupied === "boolean" &&
      typeof parsed.sessionStatus.hasActiveOrders === "boolean"
        ? parsed.sessionStatus
        : null;

    return {
      tableLetter,
      menuUrl: parsed.menuUrl,
      qrSvg: parsed.qrSvg,
      visitMessage:
        typeof parsed.visitMessage === "string" ? parsed.visitMessage : null,
      sessionStatus,
    };
  } catch {
    return null;
  }
}

export function writePersistedAdminQrPanel(data: PersistedAdminQrPanel): void {
  const storage = readStorage();
  if (!storage) return;

  const tableLetter = normalizeTableLetter(data.tableLetter);
  if (!tableLetter || !data.menuUrl || !data.qrSvg) return;

  try {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        tableLetter,
        menuUrl: data.menuUrl,
        qrSvg: data.qrSvg,
        visitMessage: data.visitMessage,
        sessionStatus: data.sessionStatus,
      }),
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function formatAdminSessionStatusMessage(
  tableLetter: string,
  status: AdminTableSessionStatus | null,
): string | null {
  if (!status) return null;

  const label = `Table ${tableLetter}`;
  if (!status.visitOpen) {
    return `${label} is closed — tap Open table for new guests when ready.`;
  }
  if (status.sessionOccupied) {
    return `${label} — a guest device is connected and ordering.`;
  }
  if (status.hasActiveOrders) {
    return `${label} has an active order in progress.`;
  }
  return `${label} is open — waiting for a guest to scan.`;
}
