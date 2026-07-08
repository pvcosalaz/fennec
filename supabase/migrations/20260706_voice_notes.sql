-- ═══ Fennec Network · the radio ═══
-- Voice notes between connected producers. "On air" 48h unless printed to
-- tape. RLS requires a network_connections row — no connection, no
-- frequency, no message. "No cold DMs" is a database policy, not a promise.

create table if not exists public.voice_notes (
  id               uuid primary key default gen_random_uuid(),
  sender_id        uuid not null references public.profiles(id) on delete cascade,
  recipient_id     uuid not null references public.profiles(id) on delete cascade,
  audio_url        text not null,
  duration_seconds integer,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '48 hours',
  archived         boolean not null default false,  -- "printed to tape"
  played_at        timestamptz
);
alter table public.voice_notes enable row level security;

-- Helper: are these two producers connected (either direction)?
create or replace function public.are_connected(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from network_connections
    where (owner_id = a and contact_id = b) or (owner_id = b and contact_id = a)
  );
$$;

-- Read a note only if you're a party AND the two are connected.
drop policy if exists "read notes in my frequencies" on public.voice_notes;
create policy "read notes in my frequencies" on public.voice_notes
  for select using (
    (auth.uid() = sender_id or auth.uid() = recipient_id)
    and are_connected(sender_id, recipient_id)
  );

-- Send only as yourself, only to someone you're connected with.
drop policy if exists "send notes to connections" on public.voice_notes;
create policy "send notes to connections" on public.voice_notes
  for insert with check (
    auth.uid() = sender_id and are_connected(sender_id, recipient_id)
  );

-- Either party may archive ("print to tape") or mark played.
drop policy if exists "party updates note" on public.voice_notes;
create policy "party updates note" on public.voice_notes
  for update using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- Cleanup: hard-delete expired, un-archived notes. Called by the cron route.
create or replace function public.purge_expired_voice_notes()
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  with del as (
    delete from voice_notes
    where archived = false and expires_at < now()
    returning 1
  ) select count(*) into n from del;
  return n;
end;
$$;
