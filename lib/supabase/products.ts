import { getMenuByCategory, menuItems } from "@/lib/data/menu";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { MenuCategory, MenuItem } from "@/lib/types";

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
  if (!isSupabaseConfigured()) {
    return getMenuByCategory(category);
  }

  try {
    const supabase = getSupabaseAdmin();
    let query = supabase
      .from("products")
      .select("id, name, price, category, image_url, emoji")
      .order("name", { ascending: true });

    if (category !== "all") {
      query = query.eq("category", category);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data?.length) {
      return getMenuByCategory(category);
    }

    return data.map((row) => mapRow(row as ProductRow));
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
