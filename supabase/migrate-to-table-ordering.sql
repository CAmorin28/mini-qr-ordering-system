-- Run once in Supabase → SQL Editor if orders fail to save from the mobile app.
-- Symptom: POST /api/orders returns 500 (e.g. missing order_type column).

-- New dine-in / pick-up columns
alter table public.orders add column if not exists order_type text not null default 'dine_in';
alter table public.orders add column if not exists table_number text;
alter table public.orders add column if not exists grand_total numeric(10, 2);

-- Backfill grand_total for older rows
update public.orders
set grand_total = coalesce(grand_total, subtotal)
where grand_total is null;

alter table public.orders alter column grand_total set not null;

-- Optional: drop legacy delivery columns (safe if they exist)
alter table public.orders drop column if exists delivery_fee;
alter table public.orders drop column if exists service_fee;
alter table public.orders drop column if exists taxes;
alter table public.orders drop column if exists estimated_delivery;
alter table public.orders drop column if exists address;

-- Allow pending_payment status (text column — no enum change needed)
-- Ensure payment_status default matches checkout
alter table public.orders alter column status set default 'pending_payment';

-- Constraints (ignore errors if already applied)
do $$
begin
  alter table public.orders
    add constraint orders_order_type_check
    check (order_type in ('dine_in', 'pickup'));
exception
  when duplicate_object then null;
end $$;
