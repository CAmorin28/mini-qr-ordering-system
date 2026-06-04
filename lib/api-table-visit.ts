const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export interface TableVisitStatusResponse {
  tableLetter: string;
  visitOpen: boolean;
  hasActiveOrders: boolean;
  canBind: boolean;
  databaseConfigured?: boolean;
}

export async function fetchTableVisitStatus(
  tableLetter: string,
): Promise<TableVisitStatusResponse | null> {
  const table = tableLetter.trim().toUpperCase();
  if (!table) return null;

  try {
    const params = new URLSearchParams({ table });
    const res = await fetch(`${API_BASE}/api/table-visit?${params}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TableVisitStatusResponse;
  } catch {
    return null;
  }
}

/** Called from /menu/enter after scanning the admin QR code. */
export async function openTableVisitOnScan(
  tableLetter: string,
): Promise<TableVisitStatusResponse | null> {
  const table = tableLetter.trim().toUpperCase();
  if (!table) return null;

  try {
    const res = await fetch(`${API_BASE}/api/table-visit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TableVisitStatusResponse;
  } catch {
    return null;
  }
}
