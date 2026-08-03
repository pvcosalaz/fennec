-- ═══════════════════════════════════════════════════════════════
-- STUDIO PHOTO · LOS GRANTS QUE FALTARON (2026-08-02)
--
-- 20260703_security_rls.sql revoco UPDATE sobre public.profiles y lo
-- volvio a otorgar COLUMNA POR COLUMNA, para que nadie pudiera darse
-- is_pro, karma o is_admin desde la consola del navegador. Esa decision
-- sigue siendo la correcta, pero tiene un costo permanente: toda columna
-- nueva de profiles nace SIN permiso de escritura para `authenticated`.
--
-- 20260802_studio_photo.sql agrego studio_photo_url y studio_photo_luma y
-- no toco los grants. Postgres deniega el STATEMENT COMPLETO en cuanto una
-- sola columna del SET no tiene privilegio, asi que el guardado de la foto
-- moria con "permission denied for table profiles" sin nombrar la columna
-- culpable.
--
-- La UI lo mostraba como "Storage rejected the upload" porque el mismo
-- try/catch envolvia la subida y el UPDATE. La foto SI llegaba al bucket:
-- lo que fallaba era guardar su URL. Tres diagnosticos previos apuntaron a
-- storage por esa etiqueta equivocada.
-- ═══════════════════════════════════════════════════════════════

-- ── Lo unico que este archivo otorga ──
-- Son campos de presentacion del propio perfil, hermanos de avatar_url y
-- banner_url, que ya estaban en el grant desde el 2026-07-03. La policy RLS
-- de fila ("users update own profile", auth.uid() = id) sigue aplicando
-- encima: esto NO permite escribir el perfil de nadie mas.
-- GRANT es idempotente; correrlo dos veces no cambia nada.
grant update (studio_photo_url, studio_photo_luma)
  on public.profiles to authenticated;


-- ── La URL tiene que ser NUESTRA ──
-- studio_photo_url ahora lo escribe el navegador, y el dashboard lo mete
-- crudo en un background-image. Sin esto, cualquiera podria apuntar su
-- fondo a un dominio externo y convertir su propio dashboard en una baliza
-- hacia un tercero. La validacion vive aqui y no en el cliente porque el
-- cliente es justamente lo que no controlamos.
-- No se fija el host del proyecto a proposito: asi la restriccion sigue
-- sirviendo en staging y en cualquier clon.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_studio_photo_url_ck'
  ) then
    alter table public.profiles
      add constraint profiles_studio_photo_url_ck
      check (
        studio_photo_url is null
        or studio_photo_url like 'https://%/storage/v1/object/public/community-images/%'
      );
  end if;
end $$;


-- ── SELECT: NO SE TOCA, Y ES DELIBERADO ──
-- Verificado contra la base de produccion el 2026-08-02 con la anon key
-- (solo lecturas): `select=*` responde 200 con las 28 columnas, incluidas
-- studio_photo_url, studio_photo_luma y fennec_number, que NO estan en el
-- `grant select` del 2026-07-03. O sea que esa mitad de aquella migracion
-- fue revertida a nivel tabla con SQL que nunca se versiono.
--
-- Por eso aqui no hay ningun `revoke select` ni `grant select`: reemitir
-- ese bloque reproduciria el apagon de login que documenta
-- 20260709_move_sensitive_columns.sql:4-9 ("locked everyone out of login").
-- Lo que hoy protege los datos sensibles no son los grants de SELECT, es
-- que stripe_customer_id e is_admin ya no viven en esta tabla.


-- ── LO QUE SIGUE FUERA DEL GRANT, A PROPOSITO ──
-- karma, is_pro, is_bot, id, created_at, ig_followers, tiktok_followers,
-- yt_subscribers, social_synced_at: economia, autorizacion y datos de
-- sistema. Se escriben solo por funciones SECURITY DEFINER, el webhook de
-- Stripe o el cron, todos con service_role.
-- fennec_number: numero de ingreso, inmutable. Lo asigna un trigger
--   SECURITY DEFINER y lo blinda fn_protect_fennec_number
--   (20260706_fennec_number.sql). Jamas debe entrar al grant de UPDATE.


-- ═══════════════════════════════════════════════════════════════
-- LEE ESTO ANTES DE AGREGAR UNA COLUMNA A public.profiles
--
-- Mientras exista el `revoke update ... from authenticated` del
-- 2026-07-03, los permisos de ESCRITURA son POR COLUMNA. Una columna nueva
-- no se puede escribir desde el navegador hasta que la agregues a un
-- `grant update (...) on public.profiles to authenticated`. El sintoma no
-- ayuda: "permission denied for table profiles", sin decir cual columna.
--
-- Regla: toda migracion que haga `alter table profiles add column`, si esa
-- columna se escribe desde el cliente, debe traer su `grant update` en el
-- MISMO archivo. Si solo la escribe el servidor, no otorgues nada:
-- service_role ya la tiene.
-- ═══════════════════════════════════════════════════════════════

-- PostgREST cachea columnas y privilegios. Sin esto el arreglo puede seguir
-- fallando hasta el siguiente redeploy del proyecto.
notify pgrst, 'reload schema';
