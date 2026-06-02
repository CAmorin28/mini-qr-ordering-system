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

export type PaymentMethod = "gcash" | "cod";

export interface DeliveryDetails {
  fullName: string;
  contactNumber: string;
  address: string;
  notes: string;
}

export type OrderStatus = "pending" | "confirmed";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  lines: CartLine[];
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  taxes: number;
  cutlery: boolean;
  paymentMethod: PaymentMethod;
  delivery: DeliveryDetails;
  grandTotal: number;
  estimatedDelivery: string;
}
