-- Boat Seafood: database lock-down for the "verify token on the server" setup
-- Run once in Supabase Dashboard -> SQL Editor. Safe to re-run.
--
-- How the app works:
--   * Every write (add/edit/delete menu & daily catch, complete/clear orders, image upload,
--     customer orders) goes through a Next.js Server Action that verifies the user's token
--     and then writes with the service_role key (SUPABASE_SERVICE_ROLE_KEY, server-only).
--   * service_role bypasses RLS. Everyone else (anon key in the browser, any logged-in user)
--     gets NO write policy below, so direct writes to the database are blocked.
--
-- Before running: set SUPABASE_SERVICE_ROLE_KEY in .env.local AND on the live host, and deploy
-- the new code. Without the key, the app falls back to the user's own session and writes fail.
-- Also: Authentication -> Sign In / Providers -> turn OFF "Allow new users to sign up".

begin;

-- 0. Remove objects from the earlier version of this file, if they were ever created
drop function if exists public.place_order(text, jsonb);
drop function if exists public.is_admin();
drop table if exists public.admins;

-- 1. Remove every existing policy on the app tables (old ones may allow anon writes)
do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('menu_items', 'daily_catch', 'orders')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

alter table public.menu_items  enable row level security;
alter table public.daily_catch enable row level security;
alter table public.orders      enable row level security;

-- 2. Read-only policies (no INSERT/UPDATE/DELETE policies = writes blocked for anon & users)

-- Public site: only active menu items / available catch. Logged-in staff: everything.
create policy "menu: public reads active" on public.menu_items
  for select to anon using (is_active = true);
create policy "menu: staff read all" on public.menu_items
  for select to authenticated using (true);

create policy "catch: public reads available" on public.daily_catch
  for select to anon using (is_available = true);
create policy "catch: staff read all" on public.daily_catch
  for select to authenticated using (true);

-- Orders: hidden from the public; staff (admin dashboard, kitchen, live updates) can read
create policy "orders: staff read" on public.orders
  for select to authenticated using (true);

-- 3. Storage: remove write policies on the "images" bucket (uploads use signed URLs
--    created by the server after the token check; the bucket stays publicly readable)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      and (coalesce(qual, '') ilike '%images%' or coalesce(with_check, '') ilike '%images%')
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

commit;

-- Check the result:
--   select tablename, policyname, cmd, roles from pg_policies
--   where schemaname in ('public', 'storage') order by tablename;
