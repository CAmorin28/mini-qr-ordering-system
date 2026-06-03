-- Run once in Supabase → SQL Editor for live order updates (admin + customer).
-- Requires NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local

-- 1) Allow read access so Realtime can deliver row changes to the browser
drop policy if exists "Orders readable for realtime" on public.orders;
create policy "Orders readable for realtime"
  on public.orders
  for select
  to anon, authenticated
  using (true);

-- 2) Add orders table to the Realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
