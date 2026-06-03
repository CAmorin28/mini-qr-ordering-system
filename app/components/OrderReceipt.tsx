"use client";

import { lineSubtotal } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";
import {
  ORDER_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";
import type { PlacedOrder } from "@/lib/types";

interface OrderReceiptProps {
  order: PlacedOrder;
  id?: string;
}

export function OrderReceipt({ order, id = "order-receipt" }: OrderReceiptProps) {
  const date = new Date(order.createdAt);

  return (
    <article
      id={id}
      className="receipt-card overflow-hidden rounded-2xl border border-surface-variant bg-surface-container-lowest shadow-[0_8px_32px_rgba(29,29,53,0.08)]"
    >
      <div className="receipt-brand-bar overflow-hidden bg-primary px-md py-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/tablebite-logo-horizontal.png"
          alt="TableBite"
          width={220}
          height={44}
          className="receipt-logo block h-10 w-auto max-w-full object-contain object-left sm:h-11"
        />
      </div>

      <div className="receipt-card__body p-md sm:p-lg">
      <header className="border-b border-surface-variant pb-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Digital receipt
            </p>
            <p className="mt-1 text-sm font-medium leading-snug text-on-surface">
              {orderStatusLabel(order.status, order.customer.orderType)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-secondary-container/25 px-2.5 py-1 text-xs font-bold text-secondary">
            {paymentStatusLabel(order.paymentStatus)}
          </span>
        </div>
      </header>

      <section className="mt-md">
        <h3 className="mb-sm text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Receipt information
        </h3>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-on-surface-variant">Order number</dt>
            <dd className="font-bold text-on-surface">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Date</dt>
            <dd className="font-medium text-on-surface">
              {date.toLocaleDateString("en-PH", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Time</dt>
            <dd className="font-medium text-on-surface">
              {date.toLocaleTimeString("en-PH", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Order status</dt>
            <dd className="font-medium text-on-surface">
              {orderStatusLabel(order.status, order.customer.orderType)}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Order type</dt>
            <dd className="font-medium text-on-surface">
              {ORDER_TYPE_LABELS[order.customer.orderType]}
            </dd>
          </div>
          {order.customer.tableLetter ? (
            <div>
              <dt className="text-on-surface-variant">Table</dt>
              <dd className="font-medium text-on-surface">Table {order.customer.tableLetter}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-on-surface-variant">Payment method</dt>
            <dd className="font-medium text-on-surface">
              {PAYMENT_METHOD_LABELS[order.paymentMethod]}
            </dd>
          </div>
          <div>
            <dt className="text-on-surface-variant">Payment status</dt>
            <dd className="font-medium text-on-surface">
              {paymentStatusLabel(order.paymentStatus)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-on-surface-variant">Customer name</dt>
            <dd className="font-medium text-on-surface">{order.customer.fullName}</dd>
          </div>
          {order.customer.contactNumber ? (
            <div>
              <dt className="text-on-surface-variant">Contact number</dt>
              <dd className="font-medium text-on-surface">{order.customer.contactNumber}</dd>
            </div>
          ) : null}
          {order.customer.notes ? (
            <div className="sm:col-span-2">
              <dt className="text-on-surface-variant">Special requests</dt>
              <dd className="text-on-surface">{order.customer.notes}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="mt-md border-t border-surface-variant pt-md">
        <h3 className="mb-sm text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Itemized order details
        </h3>
        <ul className="receipt-line-items">
          {order.lines.map((line) => (
            <li key={line.item.id} className="receipt-line-item">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-on-surface">{line.item.name}</p>
                <p className="text-xs text-on-surface-variant">
                  {line.quantity} × {formatPrice(line.item.price)}
                </p>
              </div>
              <p className="shrink-0 font-bold tabular-nums text-secondary">
                {formatPrice(lineSubtotal(line))}
              </p>
            </li>
          ))}
        </ul>
        <div className="receipt-table-wrap">
          <table className="receipt-table w-full text-left text-sm">
            <thead>
              <tr className="border-b border-surface-variant text-on-surface-variant">
                <th className="pb-2 pr-2 font-semibold">Product</th>
                <th className="pb-2 px-2 text-center font-semibold">Qty</th>
                <th className="pb-2 px-2 text-right font-semibold">Unit price</th>
                <th className="pb-2 pl-2 text-right font-semibold">Item total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((line) => (
                <tr key={line.item.id} className="border-b border-surface-variant/60">
                  <td className="py-2.5 pr-2 font-medium text-on-surface">
                    {line.item.name}
                  </td>
                  <td className="py-2.5 px-2 text-center tabular-nums">{line.quantity}</td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-on-surface-variant">
                    {formatPrice(line.item.price)}
                  </td>
                  <td className="py-2.5 pl-2 text-right font-bold tabular-nums text-secondary">
                    {formatPrice(lineSubtotal(line))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-md border-t border-dashed border-surface-variant pt-md">
        <h3 className="mb-sm text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
          Total
        </h3>
        <dl className="space-y-1.5 text-sm">
          <div className="price-row text-on-surface-variant">
            <dt>Subtotal</dt>
            <dd className="font-medium text-on-surface">{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="price-row text-on-surface-variant">
            <dt>Cutlery</dt>
            <dd className="font-medium text-on-surface">
              {order.cutlery ? "Requested" : "Not requested"}
            </dd>
          </div>
          <div className="price-row border-t border-surface-variant pt-2 text-base font-bold">
            <dt className="text-on-surface">Grand total</dt>
            <dd className="text-secondary">{formatPrice(order.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <footer className="receipt-footer mt-md border-t border-dashed border-surface-variant pt-md text-center text-xs text-on-surface-variant">
        <p>Thank you for ordering with TableBite.</p>
        <p className="mt-1 font-medium text-on-surface">{order.orderNumber}</p>
      </footer>
      </div>
    </article>
  );
}
