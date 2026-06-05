import { getMenuByCategory, menuItems } from "@/lib/data/menu";
import { isDatabaseConfigured } from "@/lib/db/config";
import { getPool } from "@/lib/db/pool";
import { ensureProductsSeeded } from "@/lib/db/seed-products";
import type { MenuCategory, MenuItem } from "@/lib/types";
import type { RowDataPacket } from "mysql2";

interface ProductRow {
  id: string;
  name: string;
  price: number;
  category: MenuItem["category"];
  image_url: string | null;
  emoji: string | null;
}

function mapRow(row: ProductRow): MenuItem {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    category: row.category,
    imageUrl: row.image_url,
    emoji: row.emoji,
  };
}

export async function fetchProductsFromDb(
  category: MenuCategory = "all",
): Promise<MenuItem[]> {
  if (!isDatabaseConfigured()) {
    return getMenuByCategory(category);
  }

  try {
    await ensureProductsSeeded();
    const pool = getPool();
    const params: string[] = [];
    let sql =
      "SELECT id, name, price, category, image_url, emoji FROM products ORDER BY name ASC";

    if (category !== "all") {
      sql =
        "SELECT id, name, price, category, image_url, emoji FROM products WHERE category = ? ORDER BY name ASC";
      params.push(category);
    }

    const [rows] = await pool.query<RowDataPacket[]>(sql, params);
    if (!rows.length) {
      return getMenuByCategory(category);
    }

    return rows.map((row) => mapRow(row as ProductRow));
  } catch {
    return getMenuByCategory(category);
  }
}

export async function fetchProductMap(): Promise<Map<string, MenuItem>> {
  const products = await fetchProductsFromDb("all");
  return new Map(products.map((p) => [p.id, p]));
}

export function getLocalProducts(): MenuItem[] {
  return menuItems;
}
