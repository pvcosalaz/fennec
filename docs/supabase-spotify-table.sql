create table if not exists user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null, -- 'spotify', 'instagram', etc
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  meta jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, platform)
);
alter table user_integrations enable row level security;
create policy "users own integrations" on user_integrations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
