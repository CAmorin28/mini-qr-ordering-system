import { menuItems } from "@/lib/data/menu";
import type { OrderPayload } from "@/lib/types";

export type OrderResult =
  | {
      ok: true;
      orderId: string;
      message: string;
      total: number;
    }
  | { ok: false; status: number; error: string; expected?: number; received?: number };

export function placeOrder(body: OrderPayload): OrderResult {
  if (!body?.items?.length) {
    return { ok: false, status: 400, error: "Cart is empty" };
  }

  let computedTotal = 0;
  for (const line of body.items) {
    const menuItem = menuItems.find((m) => m.id === line.menuItemId);
    if (!menuItem) {
      return { ok: false, status: 400, error: `Unknown item: ${line.menuItemId}` };
    }
    if (line.quantity < 1) {
      return { ok: false, status: 400, error: "Invalid quantity" };
    }
    computedTotal += menuItem.price * line.quantity;
  }

  if (Math.abs(computedTotal - body.total) > 0.01) {
    return {
      ok: false,
      status: 400,
      error: "Total mismatch",
      expected: computedTotal,
      received: body.total,
    };
  }

  const orderId = `ord_${Date.now()}`;
  console.log("[order]", orderId, body);

  return {
    ok: true,
    orderId,
    message: "Order placed successfully",
    total: computedTotal,
  };
}
