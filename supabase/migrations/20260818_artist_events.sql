-- artist_events: el timeline de carrera del artista — gigs, grabaciones y
-- lanzamientos en una sola tabla (spec: docs/SPEC-artist-business-v1-events.md).
--
-- Una tabla y no tres porque el hub los pinta como UN timeline; la DIRECCION del
-- dinero la decide el kind en lib/artistBusiness.ts (un gig ingresa `fee`, una
-- grabacion invierte `cost`, un lanzamiento invierte `cost` y recupera
-- `recouped` a mano).
--
-- Tabla PROPIA y no business_projects con un campo "tipo": la migracion de
-- account_type lo deja avisado — mientras cada oficio tenga su tabla, cambiar
-- de modo en Settings no toca una fila y es reversible.

create table if not exists public.artist_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,

  kind        text not null check (kind in ('gig', 'recording', 'release')),
  title       text not null,
  -- La fecha del evento es un dia, no un instante: un show es "el 14 de
  -- septiembre", no las 21:03. date evita todo el lio de timezones que ya
  -- mordio al dashboard (dayKey / toISOString).
  event_date  date,

  -- Escalera por kind (la UI la hace avanzar, el check solo acota el universo):
  --   gig:       hold -> confirmed -> played -> paid
  --   recording: planned -> in_progress -> done
  --   release:   planned -> scheduled -> released
  status      text not null default 'hold' check (status in
                ('hold','confirmed','played','paid',
                 'planned','in_progress','done',
                 'scheduled','released')),

  -- Dinero. numeric, no float: es dinero (regla de la casa).
  fee         numeric(12,2) not null default 0,  -- lo que te pagan (gigs)
  deposit     numeric(12,2) not null default 0,  -- anticipo ya recibido
  cost        numeric(12,2) not null default 0,  -- lo que te cuesta (todos)
  recouped    numeric(12,2) not null default 0,  -- retorno manual (releases)
  currency    text not null default 'USD',

  -- Propios de gig
  venue       text,
  city        text,
  -- Propio de release
  release_type text check (release_type in ('single','ep','album','video')),

  notes       text,
  created_at  timestamptz not null default now()
);

-- El hub lista "mis eventos por fecha": un solo indice compuesto lo cubre.
create index if not exists artist_events_user_date
  on public.artist_events (user_id, event_date desc);

-- RLS owner-only, mismo patron que las tablas business_* (docs/rls-migration.sql).
alter table public.artist_events enable row level security;

drop policy if exists "users own artist events" on public.artist_events;
create policy "users own artist events"
  on public.artist_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
