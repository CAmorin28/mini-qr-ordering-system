import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      ok: true,
      database: "not_configured",
    });
  }

  try {
    const pool = getPool();
    await pool.query("SELECT 1");
    await pool.query("SELECT id FROM products LIMIT 1");
    await pool.query("SELECT completed_at, ready_at FROM orders LIMIT 1");
    await pool.query("SELECT table_number FROM table_qr_sessions LIMIT 1");

    return NextResponse.json({
      ok: true,
      database: "connected",
      orderCompletion: true,
      orderReadyHandoff: true,
      tableQrSessions: true,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        database: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
