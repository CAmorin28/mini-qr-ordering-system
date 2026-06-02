import { NextRequest, NextResponse } from "next/server";
import { getMenuByCategory } from "@/lib/data/menu";
import type { MenuCategory } from "@/lib/types";

export function GET(request: NextRequest) {
  const category =
    (request.nextUrl.searchParams.get("category") as MenuCategory | null) ??
    "all";
  const items = getMenuByCategory(category);
  return NextResponse.json({ items });
}
