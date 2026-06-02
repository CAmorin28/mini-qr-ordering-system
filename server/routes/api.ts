import { Router } from "express";
import { getMenuByCategory } from "@/lib/data/menu";
import { placeOrder } from "@/lib/orders";
import type { MenuCategory, OrderPayload } from "@/lib/types";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

apiRouter.get("/menu", (req, res) => {
  const category = (req.query.category as MenuCategory | undefined) ?? "all";
  res.json({ items: getMenuByCategory(category) });
});

apiRouter.post("/orders", (req, res) => {
  const result = placeOrder(req.body as OrderPayload);
  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      ...(result.expected !== undefined && {
        expected: result.expected,
        received: result.received,
      }),
    });
    return;
  }
  res.status(201).json({
    orderId: result.orderId,
    message: result.message,
    total: result.total,
  });
});
