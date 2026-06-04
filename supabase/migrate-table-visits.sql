-- Run in Supabase → SQL Editor (once per project)
-- Tracks whether a table QR visit is open (guests may order) or closed (staff completed the visit).

create table if not exists public.table_visits (
  table_number text primary key check (table_number ~ '^[A-Z0-9]{1,4}$'),
  is_open boolean not null default false,
  opened_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists table_visits_is_open_idx on public.table_visits (is_open);

alter table public.table_visits enable row level security;

-- Read/write via Next.js API using the service role key (bypasses RLS).
