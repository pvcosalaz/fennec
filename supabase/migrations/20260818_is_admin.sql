-- is_admin: cuentas del equipo que ven herramientas de prueba dentro de la app.
--
-- El primer uso: el interruptor Producer/Artist en Ajustes. El Business de
-- artista ya existe pero no se ofrece al publico todavia (la pantalla de
-- onboarding sigue en pausa); un admin necesita poder pararse en los dos
-- perfiles para probar sin tocar la base a mano.
--
-- Es un booleano y no un rol libre a proposito: hoy solo distingue "ve
-- herramientas de admin" de "no las ve". El dia que haga falta granularidad se
-- modela entonces, no antes.
--
-- QUIEN es admin no se escribe aqui: eso es un UPDATE puntual que se corre a
-- mano en el SQL Editor (regla de la casa: nada personal en el repo).

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

comment on column public.profiles.is_admin is
  'Cuenta del equipo: ve herramientas de prueba (p.ej. el switch Producer/Artist en Ajustes). Se otorga a mano por SQL, nunca desde la app.';
