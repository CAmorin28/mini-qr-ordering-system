-- Run in Supabase → SQL Editor (once per project)

create table if not exists public.products (
  id text primary key,
  name text not null,
  price numeric(10, 2) not null check (price >= 0),
  category text not null check (
    category in ('starters', 'mains', 'drinks', 'desserts')
  ),
  image_url text,
  emoji text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  order_number text not null,
  created_at timestamptz not null default now(),
  status text not null default 'pending_payment',
  payment_status text not null default 'pending',
  payment_method text not null check (payment_method in ('gcash', 'cash', 'cod')),
  order_type text not null default 'dine_in' check (order_type in ('dine_in', 'pickup')),
  table_number text,
  cutlery boolean not null default false,
  subtotal numeric(10, 2) not null,
  grand_total numeric(10, 2) not null,
  customer_name text not null default '',
  contact_number text not null default '',
  notes text not null default '',
  lines jsonb not null
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

alter table public.products enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products
  for select
  to anon, authenticated
  using (true);

-- Orders are written/read via Next.js API using the service role key (bypasses RLS).

-- Migration from delivery schema (run once if upgrading an existing database):
-- alter table public.orders drop column if exists delivery_fee;
-- alter table public.orders drop column if exists service_fee;
-- alter table public.orders drop column if exists taxes;
-- alter table public.orders drop column if exists estimated_delivery;
-- alter table public.orders drop column if exists address;
-- alter table public.orders add column if not exists order_type text not null default 'dine_in';
-- alter table public.orders add column if not exists table_number text;
-- update public.orders set grand_total = subtotal where grand_total is distinct from subtotal;
