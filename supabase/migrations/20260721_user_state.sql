-- user_state: generic per-user key→JSON store so device-local content
-- (content scripts/ideas/tasks, pricing settings, etc.) syncs across a user's
-- devices. One row per (user_id, key); value is the whole blob the module used
-- to keep in localStorage. Realtime-enabled so edits propagate live.
-- Modules that already have proper tables (business, audio, community, network)
-- do NOT use this — it's only for what was localStorage-only.

create table if not exists public.user_state (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  key        text        not null,
  value      jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

alter table public.user_state enable row level security;

-- Owner-only access.
drop policy if exists "user_state select own" on public.user_state;
create policy "user_state select own" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "user_state insert own" on public.user_state;
create policy "user_state insert own" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_state update own" on public.user_state;
create policy "user_state update own" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user_state delete own" on public.user_state;
create policy "user_state delete own" on public.user_state
  for delete using (auth.uid() = user_id);

-- Live sync across devices (ignore if already added).
do $$
begin
  begin
    alter publication supabase_realtime add table public.user_state;
  exception when duplicate_object then null;
  end;
end $$;
