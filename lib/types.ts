export type MenuCategory = "all" | "starters" | "mains" | "drinks" | "desserts";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Exclude<MenuCategory, "all">;
  imageUrl: string | null;
  emoji: string | null;
}

export interface CartLine {
  item: MenuItem;
  quantity: number;
}

export interface OrderPayload {
  items: { menuItemId: string; quantity: number }[];
  total: number;
}

export interface OrderResponse {
  orderId: string;
  message: string;
}

export type PaymentMethod = "gcash" | "cash";

export type OrderType = "dine_in" | "pickup";

export interface CustomerDetails {
  fullName: string;
  contactNumber: string;
  notes: string;
  orderType: OrderType;
  /** Table letter from QR session (e.g. A, B, C). */
  tableLetter: string;
}

/**
 * Admin-controlled workflow status.
 * Dine-in: pending_payment → paid → preparing → serving → served
 * Pick-up: pending_payment → paid → preparing → ready_for_pickup
 */
export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "serving"
  | "served"
  | "ready_for_pickup";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  /** Set when admin taps Done — order moves to Ready to complete. */
  readyAt: string | null;
  /** Set when admin marks the order complete — moves it to the daily archive. */
  completedAt: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  lines: CartLine[];
  subtotal: number;
  cutlery: boolean;
  paymentMethod: PaymentMethod;
  customer: CustomerDetails;
  grandTotal: number;
}
