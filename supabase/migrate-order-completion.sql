-- Run once in Supabase → SQL Editor
-- Adds admin "complete order" archive timestamp

alter table public.orders add column if not exists completed_at timestamptz;

create index if not exists orders_completed_at_idx
  on public.orders (completed_at desc nulls last);
