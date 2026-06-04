import { isSupabaseConfigured } from "@/lib/supabase/config";
import { listOrdersFromDb } from "@/lib/supabase/orders";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { activePlacedOrdersForTable } from "@/lib/order-status-nav";
import { normalizeTableLetter } from "@/lib/table-session";

export interface TableVisitStatus {
  tableLetter: string;
  visitOpen: boolean;
  hasActiveOrders: boolean;
  /** Guest may bind a table session (banner, dine-in table field). */
  canBind: boolean;
}

function isMissingTableError(message: string): boolean {
  return (
    message.includes("table_visits") &&
    (message.includes("does not exist") ||
      message.includes("Could not find") ||
      message.includes("schema cache"))
  );
}

export async function getTableVisitStatus(
  tableLetter: string,
): Promise<TableVisitStatus | null> {
  const table = normalizeTableLetter(tableLetter);
  if (!table) return null;

  let visitOpen = false;
  let visitRecorded = false;
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("table_visits")
        .select("is_open")
        .eq("table_number", table)
        .maybeSingle();

      if (error && !isMissingTableError(error.message)) {
        return null;
      }
      visitRecorded = data != null;
      visitOpen = Boolean(data?.is_open);
    } catch {
      return null;
    }
  }

  let hasActiveOrders = false;
  if (isSupabaseConfigured()) {
    try {
      const orders = await listOrdersFromDb({ activeOnly: true, tableLetter: table });
      hasActiveOrders = activePlacedOrdersForTable(orders, table).length > 0;
    } catch {
      return null;
    }
  }

  return {
    tableLetter: table,
    visitOpen,
    hasActiveOrders,
    /** No row yet = first guests at this table; closed row = staff finished the visit. */
    canBind: visitOpen || hasActiveOrders || !visitRecorded,
  };
}

/** Opens the table for a new QR scan / next party. */
export async function openTableVisit(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await supabase.from("table_visits").upsert(
      {
        table_number: table,
        is_open: true,
        opened_at: now,
        closed_at: null,
        updated_at: now,
      },
      { onConflict: "table_number" },
    );

    if (error && isMissingTableError(error.message)) return false;
    return !error;
  } catch {
    return false;
  }
}

/** Closes the visit when staff completes orders — blocks bookmarked /menu?table= links. */
export async function closeTableVisit(tableLetter: string): Promise<boolean> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isSupabaseConfigured()) return false;

  try {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await supabase.from("table_visits").upsert(
      {
        table_number: table,
        is_open: false,
        closed_at: now,
        updated_at: now,
      },
      { onConflict: "table_number" },
    );

    if (error && isMissingTableError(error.message)) return false;
    return !error;
  } catch {
    return false;
  }
}

/** Close visit only when no active orders remain for this table. */
export async function closeTableVisitIfNoActiveOrders(
  tableLetter: string,
): Promise<void> {
  const table = normalizeTableLetter(tableLetter);
  if (!table || !isSupabaseConfigured()) return;

  try {
    const orders = await listOrdersFromDb({ activeOnly: true, tableLetter: table });
    const remaining = activePlacedOrdersForTable(orders, table);
    if (remaining.length > 0) return;
    await closeTableVisit(table);
  } catch {
    /* ignore */
  }
}
