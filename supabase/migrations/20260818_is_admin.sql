-- CORRECCION del switch Producer/Artist (2026-08-18, mismo dia).
--
-- La primera version de este archivo creaba `is_admin` en public.profiles.
-- Eso deshacia el hardening del 2026-07-09 (move_sensitive_columns), que
-- saco esa columna de profiles A PROPOSITO: profiles se lee con select("*")
-- desde el navegador y no debe contener nada sensible — quien es admin es
-- informacion de reconocimiento que julio escondio en profiles_private
-- (service-role only) detras de la funcion definer public.is_admin().
--
-- Y el sintoma que reporto Paco ("le pico a Artist y se regresa solo") era el
-- OTRO candado de julio funcionando: el UPDATE de profiles esta concedido por
-- LISTA de columnas (20260703_security_rls) y account_type no estaba en la
-- lista, asi que el update del switch moria con permission denied y la UI
-- revertia el boton, como debe.
--
-- El arreglo, honrando ambos candados:
--   1. Tirar la columna equivocada (si la primera version llego a correr).
--   2. Conceder UPDATE solo de account_type, que NO es sensible: solo decide
--      que modulo de Business ves. La lista de julio sigue intacta para todo
--      lo demas (karma, is_pro, etc. siguen sin ser tocables).
--   3. Quien es admin se sigue preguntando a public.is_admin(), y se otorga
--      escribiendo profiles_private A MANO en el SQL Editor, nunca aqui.

alter table public.profiles drop column if exists is_admin;

grant update (account_type) on public.profiles to authenticated;
