"use client";

import { TILE_BG, TILE_SHADOW } from "@/components/desktop/surfaces";

/* ═══════════════════════════════════════════════════════════════
   DESKTOP UI PRIMITIVES — one visual language for every module.
   Extracted from the dashboard's design pass (2026-07-31) so
   Business, The Tape, Marketing and Community don't each invent
   their own surfaces.

   The rules this encodes:
   - Materiality over borders: a top highlight + tinted floor shadow
     reads as a physical panel; a 1px grey border reads as a div.
   - Group by function, not by box: hairline Bands and divided Cols
     carry structure without wrapping everything in cards.
   - One accent (amber). Identity color belongs to the FennecID card
     alone. No neon glows, no gradient text, no emojis.
   ═══════════════════════════════════════════════════════════════ */

export const ACCENT = "#f5a623";

/** The shared surface: a top highlight + tinted floor shadow. Spread it onto
 *  any panel that used a flat `border-white/[0.07] bg-white/[0.02]` box so
 *  every module reads as the same material. */
/* Brushed, not glassy: a lit top edge and a dark underside are what make a
   panel read as a physical object rather than a lighter rectangle. Matches
   the rails' edge lighting so the whole shell is one material
   (Paco 2026-08-02). */
/* `backdropFilter` va como variable con fallback `none`: en los módulos sin
   fotografía no cuesta nada (none es no-op), y el dashboard lo enciende solo
   para su subárbol declarando --fx-tile-blur. Así el vidrio no se derrama a
   Business, La Cinta ni Community, que siguen sobre canvas plano y no lo
   necesitan. */
export const SURFACE: React.CSSProperties = {
  background: TILE_BG,
  boxShadow: TILE_SHADOW,
  backdropFilter: "var(--fx-tile-blur, none)",
  WebkitBackdropFilter: "var(--fx-tile-blur, none)",
};

/** Staggered entrance. Drop <RiseStyle/> once per module, then put
 *  `dd-rise` on each section with an increasing animationDelay. */
export function RiseStyle() {
  return (
    <style>{`
      @keyframes ddRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
      /* fill-mode backwards, NO both.
         Con "both" la animacion se queda rellenando para siempre, y un
         elemento con animacion de transform/opacity crea un backdrop root: el
         backdrop-filter de los paneles que van dentro solo podia muestrear lo
         pintado DENTRO del wrapper, o sea nada. Desenfocaba vacio y la
         fotografia se colaba nitida, que es por que el vidrio se veia
         encimado (Paco 2026-08-03).
         Con "backwards" el relleno solo aplica ANTES de arrancar; al terminar
         el elemento vuelve a sus estilos normales (opacity 1, transform none),
         se libera el backdrop root y el blur funciona. La entrada se ve igual
         porque el ultimo keyframe ya es el estado por defecto. */
      .dd-rise { animation: ddRise .5s cubic-bezier(.16,1,.3,1) backwards; }
      @media (prefers-reduced-motion: reduce) { .dd-rise { animation: none; } }
    `}</style>
  );
}

/** Section header: a small label with a hairline running off to the right. */
/* `className` SE SUMA al margen, no lo reemplaza. La versión anterior era
   `className ?? "mt-5"`, así que pasar cualquier clase (p. ej. "dd-rise" para
   la animación de entrada) borraba en silencio la separación superior. Eso fue
   exactamente lo que encimó "SOCIAL REACH" contra la tarjeta de comunidad en el
   dashboard (Paco 2026-08-02): nadie pidió quitar el margen, se perdió por la
   forma de la API. Si algún call site necesita otro margen, que lo diga con
   `spacing`. */
export function Band({ label, children, className, action, spacing = "mt-5" }: {
  label: string; children: React.ReactNode; className?: string; action?: React.ReactNode;
  spacing?: string;
}) {
  return (
    <div className={`${spacing} ${className ?? ""}`}>
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.07), transparent)" }} />
        {action}
      </div>
      {children}
    </div>
  );
}

/** Grouping surface. Lighter than a card, heavier than nothing: the
 *  dB panel's materiality dialled down. Use to group related data. */
export function Tile({ label, children, action, className, padded = true }: {
  label?: string; children: React.ReactNode; action?: React.ReactNode;
  className?: string; padded?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${padded ? "px-4 pb-3 pt-3.5" : ""} ${className ?? ""}`}
      // Tile had its own copy of the old values, so it drifted the moment
      // SURFACE changed. One token, one material.
      style={SURFACE}
    >
      {label && (
        <div className={`mb-1.5 flex items-center justify-between ${padded ? "" : "px-4 pt-3.5"}`}>
          <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/** The hero instrument: one number that owns the screen. Same treatment
 *  as the dashboard's Fennec dB — solid accent, layered surface, light
 *  pooling from the floor rather than a halo around the glyph. */
export function Instrument({ label, value, footer, size = 92, sinCaja = false }: {
  label: string; value: string; footer?: React.ReactNode; size?: number;
  /** Sin recuadro: solo el rotulo, el numero y el pie sobre el fondo. */
  sinCaja?: boolean;
}) {
  return (
    <div
      className={`relative flex h-full flex-col items-center overflow-hidden p-5${sinCaja ? "" : " rounded-2xl"}`}
      /* Mismo tratamiento que los Tile: con foto detrás pasa a vidrio. Si se
         quedaba con su gradiente opaco propio, era el único hueco sólido en
         una pantalla de paneles translúcidos y se leía como un parche. */
      style={sinCaja ? undefined : {
        background: "var(--fx-tile-bg, linear-gradient(180deg,#151318,#100f13))",
        boxShadow: "var(--fx-tile-shadow, inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 34px -18px rgba(0,0,0,0.7))",
        backdropFilter: "var(--fx-tile-blur, none)",
        WebkitBackdropFilter: "var(--fx-tile-blur, none)",
      }}
    >
      {/* La luz del suelo pertenece a la caja: sale de su borde inferior. Sin
          caja no hay suelo del que salir, y quedaba una mancha ambar flotando. */}
      {!sinCaja && (
        <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 42% at 50% 100%, ${ACCENT}12, transparent 72%)` }} />
      )}
      <span className="relative text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-500">{label}</span>
      {/* El numero toma el alto sobrante y se centra dentro de el; el pie se
          queda abajo. Antes todo iba centrado en bloque, asi que al crecer la
          tarjeta el sobrante se acumulaba DEBAJO del pie y se leia como hueco
          muerto (Paco 2026-08-03). Ahora el panel se llena de forma simetrica
          sea cual sea su alto. */}
      <div className="relative flex flex-1 items-center" style={{ padding: "2px 4px" }}>
        <span
          className="font-black tabular-nums leading-none tracking-[-0.035em]"
          style={{ color: ACCENT, fontSize: size }}
        >
          {value}
        </span>
      </div>
      {footer}
    </div>
  );
}

/** Hairline-divided metric row. Structure without boxes. */
export function Cols({ children }: { children: React.ReactNode }) {
  return <div className="grid" style={{ gridAutoFlow: "column", gridAutoColumns: "1fr" }}>{children}</div>;
}

export function Col({ value, label, sub, extra, muted, onClick, icon }: {
  value: string; label: string; sub?: string;
  /** A quieter second line under `sub` — used for totals in other currencies. */
  extra?: string | null;
  muted?: boolean;
  onClick?: () => void; icon?: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={`group relative border-l border-white/[0.05] px-[18px] py-[11px] text-left first:border-l-0 first:pl-0.5 ${onClick ? "transition hover:bg-white/[0.02]" : ""}`}>
      {onClick && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>
        </span>
      )}
      {icon && <div className="mb-1.5">{icon}</div>}
      <b className={`text-[21px] font-extrabold tabular-nums ${muted ? "text-zinc-600" : "text-white"}`}>{value}</b>
      <span className="mt-[3px] block text-[9px] uppercase tracking-[0.16em] text-zinc-600">{label}</span>
      {sub && <span className="block text-[10px] font-semibold text-accent">{sub}</span>}
      {extra && <span className="block text-[10px] text-zinc-600">{extra}</span>}
    </Tag>
  );
}

/** Compact action row (the dashboard's "Today on Fennec" pattern):
 *  a line of text and an accent verb, divided by hairlines. */
export function ActionRow({ text, verb, onClick }: { text: string; verb: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="group flex w-full items-center justify-between gap-3 py-[9px] text-left">
      <span className="min-w-0 truncate text-[12px] text-zinc-400">{text}</span>
      <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">{verb} →</span>
    </button>
  );
}
