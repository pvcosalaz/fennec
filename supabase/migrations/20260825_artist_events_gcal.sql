-- El amarre de un evento del artista con su espejo en Google Calendar.
--
-- Fennec empuja sus eventos (gigs, grabaciones, lanzamientos con fecha) al
-- calendario primario del usuario cuando este conecto Google. Para poder
-- ACTUALIZAR o BORRAR el espejo cuando el evento cambia aqui, hay que recordar
-- que id le dio Google. Nulo = nunca se ha empujado (o el usuario no conecta).
--
-- La sincronizacion es UNA VIA (Fennec -> Google) a proposito: editar el
-- espejo en Google no regresa a Fennec. La doble via exige webhooks, etags y
-- resolucion de conflictos; para "ver mis fechas en el telefono" no hace falta.

alter table public.artist_events
  add column if not exists gcal_event_id text;
