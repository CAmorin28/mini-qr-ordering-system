import { NextRequest, NextResponse } from "next/server";
import { fetchProductsFromDb } from "@/lib/db/products";
import type { MenuCategory } from "@/lib/types";

/** GET /api/menu — alias of products for existing clients */
export async function GET(request: NextRequest) {
  const category =
    (request.nextUrl.searchParams.get("category") as MenuCategory | null) ??
    "all";

  try {
    const items = await fetchProductsFromDb(category);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Failed to load menu" }, { status: 500 });
  }
}
