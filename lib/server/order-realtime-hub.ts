import "server-only";

import type { PlacedOrder } from "@/types";

type OrderListener = (order: PlacedOrder) => void;

interface OrderRealtimeHub {
  listeners: Set<OrderListener>;
}

const HUB_KEY = Symbol.for("tablebite.order-realtime-hub");

function getHub(): OrderRealtimeHub {
  const globalStore = globalThis as typeof globalThis & {
    [HUB_KEY]?: OrderRealtimeHub;
  };
  if (!globalStore[HUB_KEY]) {
    globalStore[HUB_KEY] = { listeners: new Set() };
  }
  return globalStore[HUB_KEY];
}

/** Notify connected SSE clients that an order changed. */
export function publishOrderUpdated(order: PlacedOrder): void {
  for (const listener of getHub().listeners) {
    try {
      listener(order);
    } catch {
      /* ignore broken subscriber */
    }
  }
}

export function subscribeOrderUpdates(listener: OrderListener): () => void {
  const hub = getHub();
  hub.listeners.add(listener);
  return () => {
    hub.listeners.delete(listener);
  };
}
