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
  "linear-gradient(168deg, #131219 0%, #0f0e14 52%, #0c0b10 100%)",
].join(",");

/** The rail. Lighter and cooler than the canvas at EVERY height, so the
 *  boundary never dissolves the way the old fade-to-black one did.
 *
 *  Paco's reference had a WHITE rail against dark content. White would fight
 *  Fennec's identity, but the same read comes from pushing the panel well up
 *  the value scale and cooling it: slate bolted onto a warm room. */
export const RAIL_BG =
  "linear-gradient(180deg, #26252f 0%, #201f29 46%, #1b1a23 100%)";

/** Edge lighting is what sells metal: lit top, dark underside. */
export const RAIL_SHADOW = [
  "inset 0 1px 0 rgba(255,255,255,0.07)",
  "inset -1px 0 0 rgba(255,255,255,0.05)",
  "18px 0 48px -32px rgba(0,0,0,0.9)",
].join(",");

/** Panels sitting on the canvas. Brushed, not glassy. */
export const TILE_BG =
  "linear-gradient(180deg, rgba(255,255,255,0.048), rgba(255,255,255,0.012))";

export const TILE_SHADOW = [
  "inset 0 1px 0 rgba(255,255,255,0.075)",
  "inset 0 -1px 0 rgba(0,0,0,0.34)",
  "0 18px 40px -24px rgba(0,0,0,0.75)",
].join(",");

/* Noise as a data URI: no network request, no asset to lose. Fractal
   turbulence at high frequency reads as fine film grain rather than the
   chunky TV static a low frequency gives. */
const NOISE_URI =
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
