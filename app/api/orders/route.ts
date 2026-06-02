import { NextResponse } from "next/server";
import { placeOrder } from "@/lib/orders";
import type { OrderPayload } from "@/lib/types";

export async function POST(request: Request) {
  let body: OrderPayload;
  try {
    body = (await request.json()) as OrderPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = placeOrder(body);

  if (!result.ok) {
    return NextResponse.json(
      {
        error: result.error,
        ...(result.expected !== undefined && {
          expected: result.expected,
          received: result.received,
        }),
      },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      orderId: result.orderId,
      message: result.message,
      total: result.total,
    },
    { status: 201 },
  );
}
