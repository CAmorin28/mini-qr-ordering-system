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
    const { error: productsError } = await supabase.from("products").select("id").limit(1);
    if (productsError) {
      return NextResponse.json(
        { ok: false, database: "error", message: productsError.message },
        { status: 503 },
      );
    }

    const { error: ordersError } = await supabase
      .from("orders")
      .select("completed_at, ready_at")
      .limit(1);
    if (ordersError) {
      const missingColumn =
        ordersError.message.includes("column") || ordersError.code === "42703";
      const needsCompletion =
        missingColumn && ordersError.message.includes("completed_at");
      const needsReady =
        missingColumn && ordersError.message.includes("ready_at");
      let message = ordersError.message;
      if (needsCompletion && needsReady) {
        message =
          "Run supabase/migrate-order-completion.sql and migrate-order-ready.sql in Supabase SQL Editor.";
      } else if (needsCompletion) {
        message =
          "Run supabase/migrate-order-completion.sql in Supabase SQL Editor (adds completed_at).";
      } else if (needsReady) {
        message =
          "Run supabase/migrate-order-ready.sql in Supabase SQL Editor (adds ready_at).";
      }
      return NextResponse.json(
        { ok: false, database: "error", message },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      database: "connected",
      orderCompletion: true,
      orderReadyHandoff: true,
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
