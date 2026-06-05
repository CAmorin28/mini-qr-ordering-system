import { NextRequest, NextResponse } from "next/server";
import { fetchProductsFromDb } from "@/lib/db/products";
import type { MenuCategory } from "@/lib/types";

/** GET /api/products — list menu products (optional ?category=starters) */
export async function GET(request: NextRequest) {
  const category =
    (request.nextUrl.searchParams.get("category") as MenuCategory | null) ??
    "all";

  try {
    const products = await fetchProductsFromDb(category);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json(
      { error: "Failed to load products" },
      { status: 500 },
    );
  }
}
