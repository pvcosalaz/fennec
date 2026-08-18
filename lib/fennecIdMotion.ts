// La curva con la que se despliega un Fennec ID.
//
// Vivia escrita a mano dentro de Dashboard.tsx. Se saca aqui porque el perfil de
// Community ahora abre la credencial con el MISMO gesto, y dos copias del mismo
// numero magico se separan a la primera que alguien retoque una (Paco 2026-08-18:
// "que se abra con la misma animacion que esta ya programada en el dashboard").
//
// No es un ease: es un oscilador amortiguado (ζ=0.74) muestreado a 30 pasos. Sube,
// se pasa un 3% del tamaño final y se asienta. `linear()` existe desde iOS 17.2 y
// Chrome 113; en navegadores viejos cae al ease por defecto y la tarjeta sigue
// animando, solo que sin el rebote.
export const FENNEC_ID_OPEN_SPRING =
  "linear(0, 0.0371, 0.1278, 0.2469, 0.3762, 0.5032, 0.6199, 0.7218, 0.8071, 0.8757, 0.9288, 0.9681, 0.9958, 1.014, 1.0249, 1.0302, 1.0315, 1.0302, 1.0273, 1.0235, 1.0194, 1.0154, 1.0118, 1.0086, 1.0059, 1.0038, 1.0022, 1.0009, 1.0001, 1)";

/** Al abrir la credencial se deja rebotar; al cerrar no, porque un rebote de
 *  salida se lee como duda. */
export const FENNEC_ID_OPEN = `0.5s ${FENNEC_ID_OPEN_SPRING}`;
export const FENNEC_ID_CLOSE = "0.26s cubic-bezier(.3,0,.66,1)";

/** Lo que tardan en desaparecer la tarjeta y el fondo. El desmontaje espera esto
 *  para que no haya un parpadeo en blanco entre que se va una cosa y la otra. */
export const FENNEC_ID_EXIT_MS = 340;

/** Las acciones entran cuando la credencial ya aterrizo, no con ella. Primero
 *  llega el objeto, luego lo que puedes hacer con el. */
export const FENNEC_ID_ACTIONS_DELAY = "0.28s";
