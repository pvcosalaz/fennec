"use client";

/* ═══════════════════════════════════════════════════════════════
   "ABREME ESTE TRACK EN LA CINTA"

   La pieza compartida que faltaba (Paco 2026-08-04). La necesitan
   DOS cosas distintas, y por eso vale la pena que exista una sola
   vez:

   · Los tracks en el perfil de un productor. Hoy son catalogo: ves
     que subio pero no puedes escucharlo, o sea que el circuito de
     descubrimiento se corta justo antes del final.
   · La notificacion de feedback. Ya sabe a que track apunta (lleva
     entity_type/entity_id desde la migracion), pero al picarle no
     pasaba nada.

   POR QUE UN EVENTO Y NO PROPS: el origen puede ser el perfil de
   community, la campana del shell o cualquier cosa que venga
   despues; el destino es La Cinta. Cablearlo con props obligaria a
   pasar un callback por PricingCalculator, Community, CommunityPanel
   y UserProfilePage — cuatro componentes que no tienen nada que ver
   con reproducir audio. Un evento deja a cada extremo sabiendo solo
   lo suyo.

   POR QUE ADEMAS sessionStorage: entre pedir el track y montarse La
   Cinta hay un cambio de pestaña, o sea un render. El evento se
   pierde si el modulo todavia no existe; el valor guardado lo
   recoge al montar. El evento sirve para cuando La Cinta YA esta
   abierta.
   ═══════════════════════════════════════════════════════════════ */

const CLAVE = "fennec_open_track_v1";
export const EVENTO_ABRIR_TRACK = "fennec:open-track";

/** Pide que La Cinta abra este track. Lo escucha el shell (para cambiar de
 *  modulo) y AudioModule (para cargar la pista). */
export function openTrackInTape(trackId: string) {
  try { sessionStorage.setItem(CLAVE, trackId); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_TRACK, { detail: trackId }));
}

/** Lee y CONSUME la peticion pendiente. Se consume a proposito: si se quedara,
 *  volver a La Cinta por la barra te devolveria siempre al mismo track en vez
 *  de a la cola normal. */
export function takePendingTrack(): string | null {
  try {
    const v = sessionStorage.getItem(CLAVE);
    if (v) sessionStorage.removeItem(CLAVE);
    return v;
  } catch { return null; }
}
