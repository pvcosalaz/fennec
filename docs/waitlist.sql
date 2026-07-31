-- Waitlist / early-access signups from the Instagram campaign.
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to re-run.

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,      -- stored lowercased by the app
  name       text,
  genre      text,                      -- what they produce, from lib/genres.ts
  lang       text,                      -- 'es' | 'en' — the form language, so
                                        -- launch emails go out in that language
  source     text,                      -- campaign tag from ?src= (e.g. a video id)
  created_at timestamptz not null default now()
);

-- Add columns for tables created before these fields existed (idempotent).
alter table public.waitlist add column if not exists lang text;

-- Row Level Security: the public (anon key) may ONLY insert their own signup.
-- Nobody can read the list with the anon key — you read/export it from the
-- Supabase dashboard (or with the service-role key), so emails stay private.
alter table public.waitlist enable row level security;

drop policy if exists "anon can join waitlist" on public.waitlist;
create policy "anon can join waitlist"
  on public.waitlist
  for insert
  to anon, authenticated
  with check (true);
