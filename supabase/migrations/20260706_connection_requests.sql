-- ═══ Fennec Network · connect requests (from the public /u page + v2 card) ═══
-- The static card URL only lets someone REQUEST — the owner approves,
-- preserving "in person only, total trust" even from a link/physical card.

create table if not exists public.connection_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  status       text not null default 'pending' check (status in ('pending','accepted','ignored')),
  unique(requester_id, target_id)
);
alter table public.connection_requests enable row level security;

drop policy if exists "see requests i sent or received" on public.connection_requests;
create policy "see requests i sent or received" on public.connection_requests
  for select using (auth.uid() = requester_id or auth.uid() = target_id);

drop policy if exists "create my own request" on public.connection_requests;
create policy "create my own request" on public.connection_requests
  for insert with check (auth.uid() = requester_id);

drop policy if exists "target updates status" on public.connection_requests;
create policy "target updates status" on public.connection_requests
  for update using (auth.uid() = target_id);
