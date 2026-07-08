-- ═══ Fennec · community feature suggestions ═══
-- Producers suggest improvements from Settings; the team triages them in
-- /admin. Designed to support upvotes later (vote_count column ready).

create table if not exists public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  body        text not null check (char_length(body) between 3 and 1000),
  status      text not null default 'new'
              check (status in ('new', 'planned', 'in_progress', 'done', 'declined')),
  vote_count  integer not null default 0,
  created_at  timestamptz not null default now()
);
alter table public.suggestions enable row level security;

-- A producer can read and create their OWN suggestions.
drop policy if exists "read own suggestions" on public.suggestions;
create policy "read own suggestions" on public.suggestions
  for select using (auth.uid() = user_id);

drop policy if exists "create own suggestion" on public.suggestions;
create policy "create own suggestion" on public.suggestions
  for insert with check (auth.uid() = user_id);

-- Admins read everything (the /admin triage view). Reuses the is_admin flag.
drop policy if exists "admins read all suggestions" on public.suggestions;
create policy "admins read all suggestions" on public.suggestions
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Admins update status.
drop policy if exists "admins update suggestions" on public.suggestions;
create policy "admins update suggestions" on public.suggestions
  for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );
