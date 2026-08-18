-- account_type: que oficio ejerce la cuenta, artista o productor.
--
-- Fennec nacio para productores y toda la base actual lo es. Al abrirse a
-- artistas hace falta saber que modulo de negocio le toca a cada quien, y por
-- eso este campo.
--
-- Lo importante de como se modela:
--
-- 1. Es NULL por defecto y no 'producer'. Null no significa "no sabemos que
--    es", significa "todavia no se lo hemos preguntado", que es justo lo que
--    dispara la pantalla de bienvenida. Si el default fuera 'producer', nadie
--    veria nunca esa pantalla y no habria forma de distinguir a quien eligio
--    productor de quien nunca eligio.
--
-- 2. La UI trata null como productor mientras tanto, asi que la base existente
--    no cambia de comportamiento con este despliegue.
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

comment on column public.profiles.account_type is
  'Que modulo de negocio ve la cuenta: artist | producer. NULL = todavia no se le ha preguntado (dispara el onboarding). No es identidad publica, eso es profiles.role.';

-- Sin indice: no se filtra por este campo, se lee junto con el resto del perfil
-- que ya viene por la clave primaria.
