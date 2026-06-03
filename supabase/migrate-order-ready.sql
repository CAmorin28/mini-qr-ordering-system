-- Run in Supabase → SQL Editor (once per project)
-- Tracks when admin taps "Done" (hand-off to Ready to complete, before archive).

alter table public.orders add column if not exists ready_at timestamptz;

create index if not exists orders_ready_at_idx
  on public.orders (ready_at desc nulls last);
