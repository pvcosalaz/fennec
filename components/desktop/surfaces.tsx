"use client";

/* ═══════════════════════════════════════════════════════════════
   DESKTOP SURFACES — "studio at night"

   The shell was one flat near-black (#0b0a08) everywhere, and the
   sidebar's gradient FADED INTO that same value at the bottom, so
   the two surfaces dissolved into each other and the whole app read
   as a single dead sheet (Paco 2026-08-02).

   Three ideas, borrowed from how a real room looks after dark:

   1 · TEMPERATURE, not one value. The canvas carries a warm amber
       bloom from the top-left — a desk lamp — and a cool graphite
       bloom from the bottom-right. Same darkness, but the eye reads
       depth because the corners disagree.

   2 · THE RAIL IS AN OBJECT. It stays consistently lighter and
       cooler than the canvas from top to bottom, with a 1px lit top
       edge and a luminous right hairline. That's what makes metal
       look like metal: an edge catching light, not a gradient.

   3 · GRAIN OVER EVERYTHING. Large soft gradients band into visible
       stripes on wide displays. A fixed noise layer breaks the
       banding and, more importantly, makes the separate surfaces
       feel like one material.

   Fixed + pointer-events-none on every decorative layer: grain on a
   scrolling container repaints continuously and kills the GPU.
   ═══════════════════════════════════════════════════════════════ */

/** The room. Never a flat fill. */
export const CANVAS_BG = [
  "radial-gradient(120% 92% at 10% -12%, rgba(245,166,35,0.09), transparent 55%)",
  "radial-gradient(110% 85% at 102% 110%, rgba(96,116,168,0.10), transparent 62%)",
  /* Lifted 2026-08-02: the first pass still read as black on Paco's display.
     Dark grey, not black — the blooms only register once the base is light
     enough to have somewhere to go. The rail sits ~11 steps above this, which
     keeps the two surfaces clearly separate after the lift. */
  "linear-gradient(168deg, #1a1922 0%, #16151d 52%, #121118 100%)",
].join(",");

/** The rail. Lighter and cooler than the canvas at EVERY height, so the
 *  boundary never dissolves the way the old fade-to-black one did.
 *
 *  Paco's reference had a WHITE rail against dark content. White would fight
 *  Fennec's identity, but the same read comes from pushing the panel well up
 *  the value scale and cooling it: slate bolted onto a warm room. */
export const RAIL_BG =
  "linear-gradient(180deg, #302f3c 0%, #2a2935 46%, #24232e 100%)";

/** Edge lighting is what sells metal: lit top, dark underside. */
export const RAIL_SHADOW = [
  "inset 0 1px 0 rgba(255,255,255,0.07)",
  "inset -1px 0 0 rgba(255,255,255,0.05)",
  "18px 0 48px -32px rgba(0,0,0,0.9)",
].join(",");

/* ── EL DOCK ──────────────────────────────────────────────────
   La barra dejó de ser una columna pegada al borde y pasó a ser un objeto
   que flota sobre el fondo, como en la referencia que mandó Paco
   (2026-08-03). Eso cambia el material: una columna a sangre puede ser
   opaca porque es pared; algo que flota tiene que dejar ver lo que tiene
   detrás o se lee como un parche pegado encima.

   Por eso vidrio de verdad y no un tinte translúcido a secas: el blur es
   lo que hace legible un panel sobre una fotografía. Deja pasar color y
   luz, no deja pasar el detalle. Sin blur, translúcido es ruido.        */
export const DOCK_BG =
  "linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.038))";

export const DOCK_BLUR = "blur(22px) saturate(150%)";

/** Borde interior claro arriba + sombra ancha abajo: es lo que separa un
 *  objeto que flota de un rectángulo dibujado sobre el fondo. */
export const DOCK_SHADOW = [
  "inset 0 1px 0 rgba(255,255,255,0.16)",
  "inset 0 0 0 1px rgba(255,255,255,0.055)",
  "0 28px 64px -26px rgba(0,0,0,0.92)",
  "0 4px 14px -8px rgba(0,0,0,0.6)",
].join(",");

/** Panels sitting on the canvas. Brushed, not glassy.
 *
 *  Va detrás de una variable CSS para que un subárbol pueda cambiar el
 *  material sin que cada panel sepa nada. Lo usa el dashboard cuando hay foto
 *  de estudio: sobre un canvas oscuro un blanco al 4.8% se lee como panel, pero
 *  sobre una fotografía es una ventana y el texto encima compite con los
 *  monitores y los cables del cuarto (Paco 2026-08-02). */
export const TILE_BG =
  "var(--fx-tile-bg, linear-gradient(180deg, rgba(255,255,255,0.048), rgba(255,255,255,0.012)))";

/* ── VIDRIO SOBRE FOTOGRAFÍA ───────────────────────────────────
   Los paneles eran opacos (0.90) cuando había foto de estudio: legible pero
   muerto, y contradice la referencia que mandó Paco, donde se ve el cuarto a
   través de las tarjetas.

   La pieza que lo hace posible es el BLUR, no la transparencia. El blur no
   cambia el brillo del fondo, solo le quita el detalle: pasa el color y la
   luz, no pasan los cables ni los monitores. Sin blur, translúcido es ruido y
   el texto compite con la habitación.

   Y el tinte es OSCURO, no blanco. La referencia es una sala luminosa, así que
   su vidrio es claro; Fennec es oscuro. Un tinte blanco sobre una foto sube el
   fondo y tumba el contraste del texto claro.

   ALPHA 0.78, elegido midiendo, no a ojo. El peor caso NO es la pared blanca
   a mediodía: es un estudio OSCURO con un punto muy brillante (un monitor
   encendido, una lámpara). Ahí el velo es tenue —porque la foto es oscura— y
   el brillo se cuela entero. Contraste de zinc-400 en ese escenario:
     0.66 → 3.88 (falla)   0.70 → 4.22 (falla)
     0.74 → 4.60 (justo)   0.78 → 4.99 (elegido)
   El mínimo WCAG para texto normal es 4.5. */
export const TILE_BG_OVER_PHOTO =
  "linear-gradient(180deg, rgba(22,21,28,0.76), rgba(15,14,20,0.82))";

export const TILE_BLUR_OVER_PHOTO = "blur(24px) saturate(140%)";

/** Con fondo detrás, el panel necesita canto: un filo claro arriba lo separa
 *  de la foto, y una sombra ancha lo despega en vez de dejarlo pegado. */
export const TILE_SHADOW_OVER_PHOTO = [
  "inset 0 1px 0 rgba(255,255,255,0.13)",
  "inset 0 0 0 1px rgba(255,255,255,0.05)",
  "0 22px 50px -26px rgba(0,0,0,0.9)",
].join(",");

/* Igual que TILE_BG: detrás de una variable para que el dashboard pueda
   cambiar el canto cuando hay foto, sin que cada panel sepa nada. Las comas
   del fallback son parte del fallback, es válido en var(). */
const TILE_SHADOW_FLAT =
  "inset 0 1px 0 rgba(255,255,255,0.075), inset 0 -1px 0 rgba(0,0,0,0.34), 0 18px 40px -24px rgba(0,0,0,0.75)";

export const TILE_SHADOW = `var(--fx-tile-shadow, ${TILE_SHADOW_FLAT})`;

/* Noise as a data URI: no network request, no asset to lose. Fractal
   turbulence at high frequency reads as fine film grain rather than the
   chunky TV static a low frequency gives. */
export const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/** Film grain across the whole viewport. Sits above surfaces, below content. */
export function Grain({ opacity = 0.05 }: { opacity?: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{
        backgroundImage: NOISE_URI,
        opacity,
        mixBlendMode: "overlay",
      }}
    />
  );
}

/**
 * The fox, promoted from watermark to atmosphere.
 *
 * It was already there at 3.5% opacity, forced to pure white by
 * `brightness(0) invert(1)` — a grey smudge. Paco's reference had pine
 * trees lit from behind, which is the same move: a silhouette with light
 * pooling around it, anchoring one corner so the layout has a horizon.
 *
 * So: keep the silhouette, put a warm bloom behind it, and let it be amber
 * instead of grey. `inset` is the shell's content frame (sidebar/rail).
 *
 * Dialled down from the first pass: at 7.5% it started competing with the
 * numbers sitting on top of it (Paco 2026-08-02). Atmosphere has to be felt
 * before it's noticed — the moment you read it as a picture, it's too loud.
 */
export function Atmosphere({
  inset,
  intensity = 1,
}: {
  inset?: { left?: number | string; right?: number | string };
  intensity?: number;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ left: inset?.left ?? 0, right: inset?.right ?? 0 }}
    >
      {/* Light pooling behind the shape, so it reads as lit rather than pasted */}
      <div
        className="absolute"
        style={{
          right: "-14%",
          bottom: "-26%",
          width: "min(120vh, 1180px)",
          aspectRatio: "1",
          background:
            "radial-gradient(circle at 50% 55%, rgba(245,166,35,0.075), rgba(245,166,35,0.022) 42%, transparent 68%)",
          opacity: intensity,
        }}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/fennec-icon-transparent.png"
        alt=""
        className="absolute"
        style={{
          width: "min(120vh, 1100px)",
          height: "auto",
          right: "-8%",
          bottom: "-14%",
          opacity: 0.042 * intensity,
          // Amber, not the old brightness(0) invert(1) grey.
          filter: "brightness(0) saturate(100%) invert(72%) sepia(58%) saturate(1180%) hue-rotate(343deg) brightness(101%) contrast(96%)",
        }}
      />
    </div>
  );
}

/** Diagonal specular sweep for hero panels. Static: a moving sheen on a
 *  dashboard is a toy, not a tool. */
export const SHEEN =
  "linear-gradient(104deg, transparent 26%, rgba(255,255,255,0.055) 44%, rgba(255,255,255,0.015) 54%, transparent 68%)";
