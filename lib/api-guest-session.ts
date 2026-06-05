import { normalizeTableLetter } from "@/lib/table-session";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface GuestSessionStatus {
  enforced: boolean;
  valid: boolean;
  tableLetter: string;
  tableLabel?: string;
  code?: string;
}

/** Validate the device-bound httpOnly guest session. */
export async function fetchGuestSessionStatus(
  tableLetter?: string,
): Promise<GuestSessionStatus | null> {
  try {
    const params = new URLSearchParams();
    const table = normalizeTableLetter(tableLetter);
    if (table) params.set("table", table);
    const qs = params.toString();
    const res = await fetch(
      `${API_BASE}/api/guest-session${qs ? `?${qs}` : ""}`,
      {
        cache: "no-store",
        credentials: "include",
      },
    );
    if (res.status === 401 || res.status === 403) {
      const data = (await res.json()) as GuestSessionStatus;
      return data;
    }
    if (!res.ok) return null;
    return (await res.json()) as GuestSessionStatus;
  } catch {
    return null;
  }
}

/** True when the httpOnly guest session is active and bound to this table letter. */
export async function guestSessionBoundToTable(
  tableLetter: string,
): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return false;

  const status = await fetchGuestSessionStatus(table);
  if (!status) return false;
  if (status.enforced === false) return true;
  return (
    status.valid === true &&
    normalizeTableLetter(status.tableLetter) === table
  );
}

/** Reset the server idle timer while the guest is actively using the menu. */
export async function touchGuestSessionActivity(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/guest-session`, {
      method: "PATCH",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Clear server guest session cookie when a table visit ends. */
export async function clearServerGuestSession(options?: {
  /** When false, only clears the cookie — does not release the table slot in MySQL. */
  releaseSlot?: boolean;
}): Promise<void> {
  try {
    const params = new URLSearchParams();
    if (options?.releaseSlot === false) {
      params.set("cookieOnly", "1");
    }
    const qs = params.toString();
    await fetch(`${API_BASE}/api/guest-session${qs ? `?${qs}` : ""}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    /* ignore */
  }
}
