/* ═══════════════════════════════════════════════════════════════
   BANDERAS DE PRODUCTO

   Nada borrado, todo apagado desde un solo sitio. Prenderlo el dia
   del lanzamiento movil es cambiar un false por un true.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Network: coleccionar productores intercambiando Fennec IDs (QR, escaneo,
 * "Share my ID", el estante de la coleccion).
 *
 * APAGADO para el lanzamiento web (Paco 2026-08-03). La mecanica es cara a
 * cara y con el telefono en la mano: en una computadora nadie le acerca el
 * monitor a otro para que escanee, asi que hoy es peso muerto. Se guarda como
 * novedad del lanzamiento de la app movil, donde si tiene sentido y ademas
 * sirve de gancho.
 *
 * La TARJETA se queda: es el ancla de identidad del dashboard y donde vive tu
 * dB y tu numero. Lo que se esconde es el intercambio, no quien eres.
 *
 * Efecto secundario a favor: quien entre por web estos meses se queda con los
 * numeros bajos, y cuando se active el coleccionar ya traera una tarjeta que
 * nadie mas va a poder tener.
 */
export const NETWORK_ENABLED = false;

/**
 * Fondo WebGL de La Cinta: hilos que ondulan con el nivel real del track
 * (WebThreads de React Bits, adaptado en components/visuals).
 *
 * ENCENDIDO para evaluarlo en vivo (Paco 2026-08-06). No se puede juzgar en el
 * harness: /api/dev-audio da 404 en produccion, y el panel del navegador
 * reporta la pagina como oculta, asi que ahi los rAF ni siquiera corren.
 *
 * Apagarlo es cambiar este true por false: el chunk de `ogl` va por
 * next/dynamic, asi que apagado NO se descarga. Si el fondo falla al crear el
 * contexto WebGL tampoco pasa nada — TapeDeckDesktop lo envuelve para que un
 * adorno jamas tumbe el modulo.
 */
export const TAPE_THREADS_ENABLED = true;
