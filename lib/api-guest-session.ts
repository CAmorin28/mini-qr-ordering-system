const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface GuestSessionStatus {
  enforced: boolean;
  valid: boolean;
  tableLetter: string;
  tableLabel?: string;
  code?: string;
}

/** Validate the device-bound httpOnly guest session (production). */
export async function fetchGuestSessionStatus(): Promise<GuestSessionStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/guest-session`, {
      cache: "no-store",
      credentials: "include",
    });
    if (res.status === 401) {
      const data = (await res.json()) as GuestSessionStatus;
      return data;
    }
    if (!res.ok) return null;
    return (await res.json()) as GuestSessionStatus;
  } catch {
    return null;
  }
}

/** Clear server guest session cookie when a table visit ends. */
export async function clearServerGuestSession(): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/guest-session`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch {
    /* ignore */
  }
}
