import mysql, { type SslOptions } from "mysql2/promise";
import { isDatabaseConfigured } from "@/lib/db/config";

let pool: mysql.Pool | null = null;

function useMysqlSsl(): boolean {
  const flag = process.env.MYSQL_SSL?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;
  return process.env.MYSQL_HOST?.toLowerCase().includes("aivencloud.com") ?? false;
}

function getSslOptions(): SslOptions | undefined {
  if (!useMysqlSsl()) return undefined;

  const ca = process.env.MYSQL_SSL_CA?.replace(/\\n/g, "\n").trim();
  if (ca) {
    return { ca, rejectUnauthorized: true };
  }

  return { rejectUnauthorized: true };
}

export function getPool(): mysql.Pool {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }

  if (!pool) {
    const ssl = getSslOptions();
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST!.trim(),
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER!.trim(),
      password: process.env.MYSQL_PASSWORD ?? "",
      database: process.env.MYSQL_DATABASE!.trim(),
      waitForConnections: true,
      connectionLimit: 10,
      dateStrings: false,
      ...(ssl ? { ssl } : {}),
    });
  }

  return pool;
}
