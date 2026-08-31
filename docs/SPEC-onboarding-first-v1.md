# Spec · Onboarding-first v1 — personalización antes del registro y la revelación del Fennec ID

> Definido con Paco el 2026-08-30, a partir del reel de @chris.raroque ("My Top 10 App
> Mistakes, 5/10"): su app pedía cuenta ANTES del onboarding y convertía 52%; al voltear
> el orden subió a 93%. Fennec hoy es login-first: el visitante nuevo ve "crea tu cuenta"
> en frío, sin haber tocado nada. Este spec voltea el orden antes de la beta cerrada de
> septiembre, para medir el funnel correcto desde el día uno.

## Decisiones tomadas (y su porqué)

1. **Artistas entran de verdad.** El selector "What are you?" (prototipo
   `docs/prototipos/selector-artista-productor.html`, en pausa desde agosto) despierta
   con AMBOS roles activos. Quien elige Artist recibe el onboarding adaptado y aterriza
   en el módulo de artista ya construido. La beta cerrada es el lugar para probarlo con
   pocos usuarios reales. Esto despierta el prerequisito anotado: el Fennec dB debe
   sumar la actividad de artista (hoy solo suma proyectos/clientes/cotizaciones de
   productor). Va como tarea del mismo paquete.
2. **El onboarding termina en el registro. No hay modo invitado.** Sin tocar módulos
   reales sin cuenta: nada de estado huérfano por módulo ni migraciones de invitado.
   Es exactamente el alcance que el video midió.
3. **La galleta primero (decisión de Paco, literal: "ya que recibió la galleta, se la
   quiere comer").** La revelación completa del Fennec ID ocurre ANTES del registro.
   El signup se llama "Save your Fennec ID": no pagas un peaje, proteges algo que ya
   es tuyo. Efecto dotación aplicado.
4. **La tarjeta que ves es la tarjeta que te quedas.** El tono golden-angle se fija en
   el momento de la revelación y se persiste tal cual al crear la cuenta. Si el color
   se asignara al crear la fila del perfil, la tarjeta podría cambiar después del
   registro y se rompe la magia. Regla dura: la revelación usa el COMPONENTE real de
   la tarjeta (`FennecIdCard`), nunca un video ni una réplica.

## El flujo (7 pasos)

| # | Pantalla | Qué pasa |
|---|---|---|
| 1 | **What are you?** | El selector Capcom: ARTIST vs PRODUCER gigantes, zorro al fondo (opacidad ~.032). Cero texto explicativo. |
| 2 | **What do you make? / What do you play?** | El rol, adaptado al paso 1. Chips grandes: Beatmaker, Mixing/Master, Composer, Songwriter (producer) · Solo artist, Band, DJ, Cantautor (artist). Hoy `role` es un campo muerto de Settings; aquí cobra vida. |
| 3 | **Genres** | El catálogo compartido `lib/genres.ts` (el mismo del waitlist de /join) como chips interactivos multi-select. |
| 4 | **What should we call you?** | Nombre artístico. Mientras escribe, su Fennec ID se asoma en vivo abajo: su color único con su nombre puesto, sello si es artista. El gancho. |
| 5 | **LA REVELACIÓN** | Animación espectacular del Fennec ID materializándose, a pantalla completa. El momento de producción del flujo. |
| 6 | **Save your Fennec ID** | Signup con Apple/Google/email. Copy de protección, no de alta. Handle sugerido desde el nombre artístico, con ajuste inline si está tomado. |
| 7 | **Dashboard** | Aterriza personalizado: géneros alimentando Inspire, módulo de negocio según el rol. |

- La UI del onboarding en inglés (regla Fennec), claves i18n EN + ES.
- Sin guiones largos en el copy (regla Fennec).
- Usuarios existentes no ven nada de esto: sesión activa entra directo.

## Datos y tubería

- **Borrador local** `fennec-onboarding-draft-v1` en localStorage mientras no hay
  cuenta: `{ accountType, role, genres[], displayName, idHue, step }`. Cerrar y volver
  te regresa donde ibas.
- **Al registrarse**, el borrador se siembra de un jalón en `profiles`
  (`account_type`, `role`, `genres`, nombre, y el tono del ID) y el borrador se borra.
  Nada sensible viaja al perfil público (regla de la casa: `profiles` es legible por
  toda la app).
- **El paso de username actual se absorbe.** `UsernameSetup` (username + avatar
  post-registro) desaparece del flujo nuevo: el handle se resuelve en el paso 6 y el
  avatar queda para Settings. Una pantalla menos entre la galleta y el dashboard.
- **El tono del ID**: se elige al llegar al paso 4 (aleatorio dentro del sistema
  golden-angle de `lib/fennecIdPalette.ts`) y viaja en el borrador hasta persistirse.

## La animación (el "increíble" de Paco)

- **Herramienta**: Motion (Framer Motion), ya en el stack con las springs de la casa
  (stiffness ~380), más WAAPI/CSS para coreografía fina. La base existente es
  `lib/fennecIdMotion.ts` (la animación del dashboard); la revelación es su versión
  producida en grande: 3D, barrido de luz, entrada del sello de artista.
- **Remotion NO va aquí**: Remotion renderiza video (React → MP4) y queda reservado
  para el recap de sesión → video IG del roadmap. La revelación es UI viva.
- **Si un momento pide vectores animados complejos** (partículas, morphs), la opción
  es Rive (o Lottie) como acento puntual, nunca reemplazando al componente real de la
  tarjeta.
- Toda animación con su variante `prefers-reduced-motion`.

## Medición

Eventos por paso (paso visto / paso completado) + registro completado, para tener
nuestro propio funnel "52% vs 93%" desde el primer día de la beta. La medición es
parte del alcance, no un extra.

## Fuera de alcance (a propósito)

- Modo invitado / probar módulos sin cuenta (decisión 2).
- Avatar en el onboarding (queda en Settings).
- Artist como "coming soon" (se descartó: entran de verdad).
- Cambios al landing fennec.audio (el onboarding vive en app.fennec.audio para
  visitantes sin sesión; el landing sigue igual).
