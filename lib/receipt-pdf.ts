import { jsPDF } from "jspdf";
import { formatPrice } from "@/lib/format";
import type { PlacedOrder } from "@/lib/types";
import { DELIVERY_FEE, SERVICE_FEE, lineSubtotal } from "@/lib/checkout";
import {
  PAYMENT_METHOD_LABELS,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";

export function downloadReceiptPdf(order: PlacedOrder): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 48;
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = margin;

  const addLine = (text: string, size = 11, bold = false) => {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(text, margin, y);
    y += size + 6;
  };

  const addRow = (label: string, value: string) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(label, margin, y);
    doc.text(value, pageWidth - margin, y, { align: "right" });
    y += 16;
  };

  addLine("TableBite", 22, true);
  addLine("Digital Receipt", 14, true);
  y += 4;
  addLine(orderStatusLabel(order.status), 11, true);
  addLine(`Payment: ${paymentStatusLabel(order.paymentStatus, order.status)}`, 10);
  y += 6;

  addLine("Receipt information", 12, true);
  addRow("Order number:", order.orderNumber);
  addRow(
    "Date & time:",
    new Date(order.createdAt).toLocaleString("en-PH"),
  );
  addRow("Customer:", order.delivery.fullName);
  addRow("Contact:", order.delivery.contactNumber);
  addRow("Address:", order.delivery.address);
  if (order.delivery.notes) {
    addRow("Notes:", order.delivery.notes);
  }
  addRow("Payment method:", PAYMENT_METHOD_LABELS[order.paymentMethod]);
  y += 6;

  addLine("Itemized order", 12, true);
  for (const line of order.lines) {
    addLine(
      `${line.item.name} | Qty ${line.quantity} | Unit ${formatPrice(line.item.price)} | Total ${formatPrice(lineSubtotal(line))}`,
      10,
    );
  }

  y += 6;
  addLine("Charges summary", 12, true);
  addRow("Subtotal:", formatPrice(order.subtotal));
  addRow("Delivery fee:", formatPrice(order.deliveryFee ?? DELIVERY_FEE));
  addRow("Service fee:", formatPrice(order.serviceFee ?? SERVICE_FEE));
  addRow(
    "Taxes:",
    order.taxes > 0 ? formatPrice(order.taxes) : "Not applicable",
  );
  addRow("Grand total:", formatPrice(order.grandTotal));
  y += 4;
  addRow("Est. delivery:", order.estimatedDelivery);

  doc.save(`${order.orderNumber}-receipt.pdf`);
}
