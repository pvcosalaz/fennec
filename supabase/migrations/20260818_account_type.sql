-- account_type: que oficio ejerce la cuenta, artista o productor.
--
-- Fennec nacio para productores y toda la base actual lo es. Al abrirse a
-- artistas hace falta saber que modulo de negocio le toca a cada quien, y por
-- eso este campo.
--
-- Lo importante de como se modela:
--
-- 1. La columna es NULL por defecto, pero a las cuentas que YA existen se les
--    siembra 'producer' (Paco 2026-08-18: "los ya existentes dejalos en
--    producer"). Toda la base actual lo es, y asi sus tarjetas llevan el sello
--    correcto desde el primer despliegue en vez de quedarse mudas.
--
-- 2. Las cuentas NUEVAS siguen naciendo en null, que no significa "no sabemos
--    que es" sino "todavia no se lo hemos preguntado". Esa diferencia es lo que
--    algun dia disparara la pantalla de bienvenida: con un default 'producer' a
--    nivel de columna nadie la veria nunca.
--
-- 3. NO es identidad publica. Eso ya lo lleva `role` (Composer, Producer, texto
--    libre) que se edita en Ajustes y sale en la tarjeta. Este campo solo
--    decide que herramientas ves, asi que cambiarlo no altera como te ve la
--    comunidad ni invalida las tarjetas que ya te escanearon.
--
-- 4. Se puede cambiar cuantas veces quieras. Por eso los datos de cada oficio
--    tienen que vivir en tablas separadas: mientras eso se cumpla, cambiar de
--    modo no toca una sola fila y es reversible. El dia que alguien meta los
--    eventos del artista dentro de business_projects con una columna "tipo",
--    este campo se vuelve destructivo. Queda avisado aqui.

alter table public.profiles
  add column if not exists account_type text
  check (account_type in ('artist', 'producer'));

-- La siembra: solo toca lo que ya existe. Es idempotente por el where, asi que
-- correrla dos veces no pisa a nadie que haya elegido despues.
update public.profiles
   set account_type = 'producer'
 where account_type is null;

comment on column public.profiles.account_type is
  'Que modulo de negocio ve la cuenta: artist | producer. NULL = todavia no se le ha preguntado (dispara el onboarding). No es identidad publica, eso es profiles.role.';

-- Sin indice: no se filtra por este campo, se lee junto con el resto del perfil
-- que ya viene por la clave primaria.
