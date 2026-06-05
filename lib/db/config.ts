const PLACEHOLDER_FRAGMENTS = ["your-password", "changeme", "xxx"];

function isRealEnvValue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const v = value.trim().toLowerCase();
  return !PLACEHOLDER_FRAGMENTS.some((p) => v.includes(p));
}

/** True when required MySQL env vars are set (password may be empty for local root). */
export function isDatabaseConfigured(): boolean {
  return (
    isRealEnvValue(process.env.MYSQL_HOST) &&
    isRealEnvValue(process.env.MYSQL_USER) &&
    isRealEnvValue(process.env.MYSQL_DATABASE)
  );
}
