"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseRealtimeConfigured } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

/** Browser Supabase client (anon key) for Realtime subscriptions only. */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === "undefined" || !isSupabaseRealtimeConfigured()) {
    return null;
  }

  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
    browserClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return browserClient;
}
