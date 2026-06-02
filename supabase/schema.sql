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
  status text not null default 'pending',
  payment_status text not null default 'pending',
  payment_method text not null check (payment_method in ('gcash', 'cod')),
  cutlery boolean not null default false,
  subtotal numeric(10, 2) not null,
  delivery_fee numeric(10, 2) not null,
  service_fee numeric(10, 2) not null,
  taxes numeric(10, 2) not null default 0,
  grand_total numeric(10, 2) not null,
  estimated_delivery text not null,
  customer_name text not null,
  contact_number text not null,
  address text not null,
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
