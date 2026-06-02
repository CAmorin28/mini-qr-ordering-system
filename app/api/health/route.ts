import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();

  if (!supabaseConfigured) {
    return NextResponse.json({
      ok: true,
      database: "not_configured",
    });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("products").select("id").limit(1);
    if (error) {
      return NextResponse.json(
        { ok: false, database: "error", message: error.message },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, database: "connected" });
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
