const PLACEHOLDER_FRAGMENTS = [
  "your-project",
  "your-anon-key",
  "your-service-role-key",
  "supabase.co/your",
];

function isRealEnvValue(value: string | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !PLACEHOLDER_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

export function isSupabaseConfigured(): boolean {
  return (
    isRealEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isRealEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

/** Browser Realtime (requires anon key + migrate-realtime-orders.sql). */
export function isSupabaseRealtimeConfigured(): boolean {
  return (
    isRealEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    isRealEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}
