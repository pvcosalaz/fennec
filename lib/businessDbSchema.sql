-- ─── business_clients ────────────────────────────────────────────────────────

create table if not exists business_clients (
  id         uuid primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null,
  phone      text not null default '',
  company    text not null default '',
  created_at timestamptz not null default now()
);

alter table business_clients enable row level security;

create policy "Users can manage their own clients"
  on business_clients
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists business_clients_user_created
  on business_clients (user_id, created_at desc);


-- ─── business_quotes ──────────────────────────────────────────────────────────

create table if not exists business_quotes (
  id                uuid primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_id         text not null default '',
  client_name       text not null default '',
  client_email      text not null default '',
  project_name      text not null default '',
  project_type_id   text not null default '',
  project_type_name text not null default '',
  min_price         numeric not null default 0,
  recommended_price numeric not null default 0,
  final_price       numeric not null default 0,
  notes             text not null default '',
  status            text not null default 'draft'
                      check (status in ('draft', 'sent', 'approved', 'declined')),
  approved_at       timestamptz,
  project_id        text,
  created_at        timestamptz not null default now()
);

alter table business_quotes enable row level security;

create policy "Users can manage their own quotes"
  on business_quotes
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists business_quotes_user_created
  on business_quotes (user_id, created_at desc);


-- ─── business_projects ────────────────────────────────────────────────────────

create table if not exists business_projects (
  id                uuid primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null default '',
  client_id         text not null default '',
  client_name       text not null default '',
  project_type_id   text not null default '',
  project_type_name text not null default '',
  price             numeric not null default 0,
  deadline          date,
  status            text not null default 'in_progress'
                      check (status in ('in_progress', 'review', 'delivered', 'paid')),
  notes             text not null default '',
  quote_id          text,
  created_at        timestamptz not null default now()
);

alter table business_projects enable row level security;

create policy "Users can manage their own projects"
  on business_projects
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists business_projects_user_created
  on business_projects (user_id, created_at desc);
