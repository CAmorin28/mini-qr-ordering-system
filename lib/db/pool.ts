import mysql, { type Pool, type SslOptions } from "mysql2/promise";
import { isDatabaseConfigured } from "@/lib/db/config";

const globalStore = globalThis as typeof globalThis & {
  __tablebiteMysqlPool?: Pool;
};

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

/** Shared pool — stored on globalThis so Next.js dev HMR does not leak connections. */
export function getPool(): Pool {
  if (!isDatabaseConfigured()) {
    throw new Error("Database is not configured");
  }

  if (!globalStore.__tablebiteMysqlPool) {
    const ssl = getSslOptions();
    globalStore.__tablebiteMysqlPool = mysql.createPool({
      host: process.env.MYSQL_HOST!.trim(),
      port: Number(process.env.MYSQL_PORT ?? 3306),
      user: process.env.MYSQL_USER!.trim(),
      password: process.env.MYSQL_PASSWORD ?? "",
      database: process.env.MYSQL_DATABASE!.trim(),
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 5,
      idleTimeout: 60_000,
      dateStrings: false,
      ...(ssl ? { ssl } : {}),
    });
  }

  return globalStore.__tablebiteMysqlPool;
}
