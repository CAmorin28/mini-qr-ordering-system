import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-api-route";
import { isDatabaseConfigured } from "@/lib/db/config";
import {
  createOrderEventStream,
  orderStreamResponse,
} from "@/lib/order-stream";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** GET /api/admin/orders/stream — SSE for live admin order board updates */
export async function GET(request: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  return orderStreamResponse(
    createOrderEventStream({ mode: "all" }, request),
  );
}
