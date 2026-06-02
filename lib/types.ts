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
