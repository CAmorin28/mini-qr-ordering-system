import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-route";
import { isDatabaseConfigured } from "@/lib/db/config";
import { discontinueOrderInDb } from "@/lib/db/orders";

/** POST /api/admin/orders/:orderId/discontinue — end order and force-terminate table session */
export async function POST(
  _request: Request,
  context: { params: Promise<{ orderId: string }> },
) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { orderId: rawId } = await context.params;
  const orderId = decodeURIComponent(rawId);

  const result = await discontinueOrderInDb(orderId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ order: result.order });
}
