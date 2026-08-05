-- ═══════════════════════════════════════════════════════════════
-- NOTIFICACIONES CON DESTINO
--
-- Hoy la tabla solo guarda type / title / body / read / created_at.
-- El texto dice "@fulano dejo una nota en tal cancion", pero eso es
-- una cadena, no un vinculo: al picarle a la notificacion no hay a
-- donde llevar a nadie (Paco 2026-08-03).
--
-- Se agrega el destino como DOS columnas nullable y nada mas. No se
-- toca RLS ni se reescribe nada existente: las notificaciones que ya
-- estan en la tabla se quedan sin destino, que es correcto —de esas
-- no sabemos a que se referian— y el codigo trata el nulo como "no
-- clickeable".
--
-- `entity_type` en vez de un track_id suelto porque el mismo mecanismo
-- va a servir para los otros tipos de aviso (cotizacion, post
-- programado) sin otra migracion.
--
-- Idempotente: se puede correr dos veces sin romper nada.
-- ═══════════════════════════════════════════════════════════════

alter table public.notifications
  add column if not exists entity_type text,
  add column if not exists entity_id   uuid;

-- Solo valores que el codigo sabe abrir. Sin esto, un typo en un
-- insert produce notificaciones que llevan a ningun lado y el sintoma
-- vuelve a ser "le pico y no pasa nada".
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_entity_type_ck'
  ) then
    alter table public.notifications
      add constraint notifications_entity_type_ck
      check (entity_type is null or entity_type in ('track', 'quote', 'post'));
  end if;
end $$;

-- Las dos van juntas o ninguna: un tipo sin id, o un id sin tipo, no
-- se puede abrir y solo ensucia los datos.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'notifications_entity_pair_ck'
  ) then
    alter table public.notifications
      add constraint notifications_entity_pair_ck
      check ((entity_type is null) = (entity_id is null));
  end if;
end $$;

-- La campana lee las notificaciones de un usuario ordenadas por fecha.
-- El indice no es por el destino, es por como se consulta.
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

notify pgrst, 'reload schema';
