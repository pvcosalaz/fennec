-- ═══════════════════════════════════════════════════════════════
-- MOVE SENSITIVE COLUMNS OFF profiles (2026-07-09)
--
-- Why: the whole app reads profiles with select("*") (auth gate, dashboard,
-- the community feed's embedded profiles!fk(*), etc.). Column-level SELECT
-- grants are INCOMPATIBLE with select("*") — Postgres tries to read every
-- column and denies the whole query. The 2026-07-03 hardening did exactly
-- that and locked everyone out of login.
--
-- The clean fix: profiles must contain NOTHING sensitive, so table-level
-- SELECT stays open and select("*") keeps working. Move stripe_customer_id
-- and is_admin into a service-role-only side table. All five call sites
-- (stripe/karma checkout, portal, webhook, adminAuth) already use the
-- service-role admin client, so they reach the side table with no auth
-- changes; anon/authenticated get zero access to it.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. The private side table: service-role only ──
create table if not exists public.profiles_private (
  id                 uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text,
  is_admin           boolean not null default false
);
alter table public.profiles_private enable row level security;
-- RLS on + no policies = anon/authenticated can do nothing. service_role
-- bypasses RLS, but grant it explicitly so the API routes are never surprised.
revoke all on public.profiles_private from anon, authenticated;
grant all on public.profiles_private to service_role;

-- Same uniqueness the old profiles(stripe_customer_id) index enforced.
create unique index if not exists profiles_private_stripe_customer_id
  on public.profiles_private (stripe_customer_id) where stripe_customer_id is not null;

-- ── 2. Backfill from the columns still on profiles ──
-- Guarded so re-running the whole migration (after step 5 drops the columns)
-- is a harmless no-op instead of a "column does not exist" error.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'stripe_customer_id'
  ) then
    insert into public.profiles_private (id, stripe_customer_id, is_admin)
    select id, stripe_customer_id, is_admin from public.profiles
    on conflict (id) do update
      set stripe_customer_id = excluded.stripe_customer_id,
          is_admin           = excluded.is_admin;
  end if;
end $$;

-- ── 2b. Keep it in sync: every new profile gets a private row ──
create or replace function public.ensure_profile_private()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles_private (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists trg_ensure_profile_private on public.profiles;
create trigger trg_ensure_profile_private
  after insert on public.profiles
  for each row execute function public.ensure_profile_private();

-- ── 3. SECURITY DEFINER admin check ──
-- RLS policies can't read profiles_private as the authenticated role (no grant),
-- so wrap the lookup in a definer function that runs as owner. search_path is
-- pinned to defeat search-path hijacking.
create or replace function public.is_admin(uid uuid default auth.uid())
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select coalesce((select p.is_admin from public.profiles_private p where p.id = uid), false);
$$;
revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to anon, authenticated, service_role;

-- ── 4. Repoint the suggestions admin policies (they read profiles.is_admin,
--       which we're about to drop) to the definer function ──
drop policy if exists "admins read all suggestions" on public.suggestions;
create policy "admins read all suggestions" on public.suggestions
  for select using (public.is_admin());

drop policy if exists "admins update suggestions" on public.suggestions;
create policy "admins update suggestions" on public.suggestions
  for update using (public.is_admin());

-- ── 5. Drop the sensitive columns from profiles. THIS closes the leak:
--       profiles.select("*") no longer returns them. ──
alter table public.profiles drop column if exists stripe_customer_id;
alter table public.profiles drop column if exists is_admin;
