-- user_integrations — tokens de OAuth de las integraciones (Google Calendar,
-- YouTube, Spotify).
--
-- [2026-08-07] La tabla NO existia: el codigo la consulta desde
-- app/api/{gcal,youtube,spotify}/* y lib/googleCalendar.ts, pero nunca se creo,
-- asi que el dia que alguien conectara su calendario el upsert habria fallado.
-- Se descubrio revisando RLS en el dashboard: no aparecia en el esquema public.
--
-- Las columnas salen del codigo que ya existe, no de una suposicion:
--   gcal/youtube/spotify callback → user_id, platform, access_token,
--     refresh_token, expires_at, updated_at
--   youtube/callback + youtube/stats → channel_id, channel_title, thumbnail,
--     subscribers, view_count
--   onConflict: "user_id,platform" → de ahi la llave unica de abajo.

create table if not exists public.user_integrations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- Los tres valores que emite el codigo hoy. El CHECK evita que un typo en un
  -- callback cree una fila fantasma que nada vuelve a leer.
  platform      text not null check (platform in ('google_calendar', 'youtube', 'spotify')),

  access_token  text,
  refresh_token text,
  expires_at    timestamptz,

  -- Solo YouTube las usa; el resto de plataformas las deja en null.
  channel_id    text,
  channel_title text,
  thumbnail     text,
  subscribers   integer,
  -- bigint, no integer: un canal grande pasa de 2,147,483,647 vistas.
  view_count    bigint,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Una fila por usuario y plataforma. Es la que usa onConflict al reconectar:
  -- volver a conectar reemplaza los tokens en vez de acumular filas muertas.
  unique (user_id, platform)
);

-- ── Seguridad ──────────────────────────────────────────────────────────────
-- RLS PRENDIDO Y SIN NINGUNA POLITICA, a proposito.
--
-- Aqui viven refresh tokens: llaves permanentes a la cuenta de Google de otra
-- persona. Ningun componente del navegador toca esta tabla (verificado), y
-- todo el acceso pasa por rutas de servidor con el cliente admin, que usa
-- service_role y se salta RLS por diseno.
--
-- Sin politicas, la llave publica del navegador no puede leer NI UNA fila,
-- ni siquiera las suyas. Es a proposito: que el dueno pueda leer su propio
-- refresh token no le sirve de nada a la app y abre un camino de fuga que hoy
-- no existe. Si algun dia el navegador necesita saber "¿estoy conectado?", eso
-- se responde desde una ruta de servidor que devuelva un booleano, nunca
-- exponiendo la tabla.
alter table public.user_integrations enable row level security;

-- Buscar por usuario+plataforma ya va por el indice de la restriccion unica,
-- asi que no hace falta otro.
