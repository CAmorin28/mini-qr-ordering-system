import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-route";
import { isDatabaseConfigured } from "@/lib/db/config";
import { listOrdersFromDb } from "@/lib/db/orders";

/** GET /api/admin/orders — list orders (admin only) */
export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;

  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: "Database not configured", orders: [] },
      { status: 503 },
    );
  }

  try {
    const orders = await listOrdersFromDb();
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
