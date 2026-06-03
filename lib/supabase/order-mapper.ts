import { normalizeOrderStatus } from "@/lib/order-labels";
import type {
  CartLine,
  CustomerDetails,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  PlacedOrder,
} from "@/lib/types";

export interface OrderRow {
  order_id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_status: PaymentStatus;
  payment_method: string;
  order_type: OrderType;
  table_number: string | null;
  cutlery: boolean;
  subtotal: number;
  grand_total: number;
  customer_name: string;
  contact_number: string;
  notes: string;
  lines: CartLine[];
  ready_at?: string | null;
  completed_at?: string | null;
  delivery_fee?: number;
  service_fee?: number;
}

function normalizePaymentMethod(method: string): PaymentMethod {
  if (method === "gcash") return "gcash";
  return "cash";
}

export function mapOrderRow(row: OrderRow | Record<string, unknown>): PlacedOrder {
  const r = row as OrderRow;
  const subtotal = Number(r.subtotal);
  const legacyFees = Number(r.delivery_fee ?? 0) + Number(r.service_fee ?? 0);
  const grandTotal =
    r.grand_total != null ? Number(r.grand_total) : subtotal + legacyFees;

  const customer: CustomerDetails = {
    fullName: r.customer_name ?? "",
    contactNumber: r.contact_number ?? "",
    notes: r.notes ?? "",
    orderType: r.order_type ?? "dine_in",
    tableLetter: r.table_number ?? "",
  };

  return {
    orderId: r.order_id,
    orderNumber: r.order_number,
    createdAt: r.created_at,
    readyAt: r.ready_at ?? null,
    completedAt: r.completed_at ?? null,
    status: normalizeOrderStatus(r.status, customer.orderType),
    paymentStatus: r.payment_status,
    lines: r.lines,
    subtotal,
    cutlery: r.cutlery,
    paymentMethod: normalizePaymentMethod(r.payment_method),
    customer,
    grandTotal,
  };
}
