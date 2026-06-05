import { menuItems } from "@/lib/data/menu";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import type { RowDataPacket } from "mysql2";

let seedPromise: Promise<boolean> | null = null;

/** Inserts lib/data/menu.ts items when the products table is empty. */
export async function ensureProductsSeeded(): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  if (!seedPromise) {
    seedPromise = seedProductsIfEmpty();
  }

  return seedPromise;
}

async function seedProductsIfEmpty(): Promise<boolean> {
  const pool = getPool();
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM products LIMIT 1",
  );

  if (existing.length > 0) return false;

  for (const item of menuItems) {
    await pool.query(
      `INSERT INTO products (id, name, price, category, image_url, emoji)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.name,
        item.price,
        item.category,
        item.imageUrl,
        item.emoji,
      ],
    );
  }

  return true;
}
