"use client";

// GitHub-style contributions heatmap for the dashboard (v4 layout, Paco
// 2026-07-22): lives right below the dB hero, above the stat chips. Compact
// strip on the home (last ~4 months); "View year" opens a full 52-week sheet.
// Amber ramp only — same accent language as the rest of the panel.

import { useState } from "react";
import { X, Flame } from "lucide-react";
import { buildHeatmapGrid, buildYearGrid, type ContributionDays, type DayDetail } from "@/lib/contributions";

const MESES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Como se llama cada tipo cuando se lee, en singular y plural. La UI de
 *  Fennec va en ingles siempre. */
const NOMBRE: Record<string, [string, string]> = {
  quote:    ["quote", "quotes"],
  project:  ["project", "projects"],
  client:   ["client", "clients"],
  post:     ["post", "posts"],
  feedback: ["note given", "notes given"],
  track:    ["track uploaded", "tracks uploaded"],
};

/** "Tue, 12 Mar" — corto, con el dia de la semana, que es lo que ubica en una
 *  rejilla donde cada columna es una semana. */
function fechaLegible(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });
}

function resumen(det: DayDetail | undefined): string {
  if (!det) return "";
  const partes = Object.entries(det)
    .filter(([, n]) => (n ?? 0) > 0)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([k, n]) => {
      const par = NOMBRE[k] ?? [k, k];
      return `${n} ${n === 1 ? par[0] : par[1]}`;
    });
  return partes.join(" · ");
}

/* La celda vacía va detrás de una variable: sobre el canvas plano un blanco al
   6% se lee, pero sobre una fotografía desaparece por completo y la rejilla se
   volvía invisible (Paco 2026-08-03). El dashboard sube ese valor cuando hay
   foto, sin que esta tarjeta tenga que saber nada. */
const LEVEL_BG = [
  "var(--fx-grid-empty, rgba(255,255,255,0.06))", // 0 — empty day
  "#5c3f12",
  "#97661a",
  "#d18f1f",
  "#f5a623",
];

function Heatmap({ byDay, weeks, cellRadius = 2, cellSize, selected, onSelect }: {
  byDay: ContributionDays["byDay"]; weeks: number; cellRadius?: number;
  /** Fixed px per cell. Without it cells stretch to fill the width, which on a
   *  wide desktop blew them up to ~40px squares (GitHub's are ~12px) and made
   *  the card eat half the dashboard. */
  cellSize?: number;
  selected: string | null;
  onSelect: (key: string | null) => void;
}) {
  /* A 52 semanas o mas se muestra el AÑO CALENDARIO (enero a diciembre). Por
     debajo sigue siendo la tira movil de las ultimas N semanas, que es lo
     correcto en movil: ahi no cabe un año y lo util es "lo reciente". */
  const grid = weeks >= 52 ? buildYearGrid(byDay) : buildHeatmapGrid(byDay, weeks);
  const fixed = cellSize != null;

  /* Rotulos de mes: sin ellos la rejilla no tiene linea de tiempo y un
     cuadrito encendido no se sabe de cuando es (Paco 2026-08-03). Se marca la
     PRIMERA columna de cada mes, que es como se lee un calendario. */
  /* El mes de una columna es el del primer dia que SI pertenece al año. Si se
     toma col[0] a secas, la primera columna es la semana de relleno de
     diciembre del año anterior y el año arrancaba rotulado "Dec"
     (Paco 2026-08-03). */
  const mesDeColumna = (col: typeof grid[number]) =>
    col.find((c) => !c.outside)?.month ?? null;

  const marcasMes = grid.map((col, i) => {
    const m = mesDeColumna(col);
    if (m == null) return null;
    const anterior = i > 0 ? mesDeColumna(grid[i - 1]) : null;
    return m !== anterior ? MESES[m] : null;
  });

  return (
    <div className="w-full">
      <div className={`mb-1 flex gap-[3px] ${fixed ? "" : "w-full"}`}>
        {grid.map((col, i) => (
          <div
            key={i}
            className={`min-w-0 text-[8px] leading-none text-zinc-600 ${fixed ? "" : "flex-1"}`}
            style={fixed ? { width: cellSize } : undefined}
          >
            {/* overflow visible: el nombre del mes es mas ancho que una columna
                de una semana, asi que se deja desbordar sobre las siguientes. */}
            {marcasMes[i] && <span className="relative whitespace-nowrap">{marcasMes[i]}</span>}
          </div>
        ))}
      </div>

      <div className={`flex gap-[3px] ${fixed ? "" : "w-full"}`}>
        {grid.map((col, i) => (
          <div
            key={i}
            className={`flex flex-col gap-[3px] ${fixed ? "" : "flex-1 min-w-0"}`}
            style={fixed ? { width: cellSize } : undefined}
          >
            {col.map((cell) => {
              const activo = cell.key === selected;
              /* `outside` son los dias de relleno para cuadrar la primera y la
                 ultima semana; `future` son los que aun no llegan. Ninguno de
                 los dos es "un dia sin actividad", asi que no se pintan como
                 tal ni se pueden elegir. */
              const fuera = cell.outside;
              const futuro = cell.future;
              return (
                <button
                  key={cell.key}
                  type="button"
                  disabled={fuera || futuro}
                  onClick={() => onSelect(activo ? null : cell.key)}
                  aria-label={`${cell.key}, ${cell.count}`}
                  aria-hidden={fuera || undefined}
                  className={`${fixed ? "" : "w-full aspect-square"} transition ${fuera || futuro ? "" : "hover:brightness-150"}`}
                  style={{
                    background: fuera ? "transparent" : futuro ? "rgba(255,255,255,0.025)" : LEVEL_BG[cell.level],
                    borderRadius: cellRadius,
                    ...(fixed ? { width: cellSize, height: cellSize } : null),
                    ...(activo ? { outline: "1.5px solid #f5a623", outlineOffset: 1 } : null),
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContributionsCard({ data, accent, weeks = 17, cellSize }: {
  data: ContributionDays | null;
  accent: string;
  /** Columns on the compact strip — mobile fits ~17, desktop bands fit more. */
  weeks?: number;
  /** Fixed px per cell (desktop). Omit on mobile so cells stretch to width. */
  cellSize?: number;
}) {
  const [showYear, setShowYear] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const byDay = data?.byDay ?? new Map<string, number>();
  const detalle = data?.detail?.get(day ?? "") ;
  const cuenta = day ? (byDay.get(day) ?? 0) : 0;

  return (
    <>
      <div
        /* h-full: la tarjeta llena su celda de la rejilla en vez de quedarse
           con su alto natural. Sin esto su borde inferior no coincidia con el
           de "Today on Fennec" —que si se estiraba— y la fila de noticias de
           abajo arrancaba en una linea torcida (Paco 2026-08-03). */
        className="flex h-full flex-col rounded-2xl border px-4 pt-3 pb-2.5"
        /* Mismo material que el resto de paneles cuando hay foto: sin esto era
           la única tarjeta sin vidrio, un ámbar al 4% por el que se veía la
           habitación nítida. */
        style={{
          borderColor: `${accent}26`,
          background: `var(--fx-tile-bg, ${accent}0a)`,
          backdropFilter: "var(--fx-tile-blur, none)",
          WebkitBackdropFilter: "var(--fx-tile-blur, none)",
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          {/* El rótulo solo decía "Contributions" y nadie tiene por qué adivinar
              qué cuenta (Paco 2026-08-03). Dice de qué está hecho, en una línea.
              Es tuyo y solo tuyo: no aparece en tu perfil público. */}
          <p className="flex items-baseline gap-2 text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: `${accent}80` }}>
            Contributions
            <span className="hidden text-[9px] font-medium normal-case tracking-normal text-zinc-500 sm:inline">
              work you logged · quotes, projects, tracks, feedback
            </span>
          </p>
          {(data?.streak ?? 0) > 1 && (
            <p className="flex items-center gap-1 text-[11px] font-extrabold" style={{ color: accent }}>
              <Flame size={12} strokeWidth={2.5} className="fill-current" />
              {data!.streak}
            </p>
          )}
        </div>

        <div className="flex min-h-0 flex-1 items-center">
          <Heatmap byDay={byDay} weeks={weeks} cellSize={cellSize} selected={day} onSelect={setDay} />
        </div>

        <div className="flex min-h-[18px] items-center justify-between mt-2.5">
          {/* Al elegir un dia, esta linea deja de ser el total y pasa a contar
              QUE se hizo ese dia. Es la respuesta a "no se que representan los
              cuadritos": ahora un cuadrito encendido se puede leer. */}
          {day ? (
            <p className="min-w-0 truncate text-[10px] text-zinc-400">
              <span className="font-semibold text-zinc-200">{fechaLegible(day)}</span>
              {cuenta > 0 ? <span className="text-zinc-500"> · {resumen(detalle) || `${cuenta}`}</span>
                          : <span className="text-zinc-600"> · nothing logged</span>}
            </p>
          ) : (
            <p className="text-[10px] text-zinc-500">
              <span className="font-extrabold text-zinc-200 tabular-nums">{data?.totalYear ?? 0}</span> this year
              <span className="ml-1.5 text-zinc-600">· pick a day</span>
            </p>
          )}
          {weeks >= 52 ? (
            // Full year already on screen (desktop): nothing more to open, so
            // the space goes to the scale legend instead of a dead link.
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-zinc-600">Less</span>
              {LEVEL_BG.map((bg, i) => (
                <span key={i} className="inline-block h-[9px] w-[9px] rounded-[2px]" style={{ background: bg }} />
              ))}
              <span className="text-[9px] text-zinc-600">More</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowYear(true)}
              className="text-[10px] font-bold transition hover:brightness-110"
              style={{ color: accent }}
            >
              View year →
            </button>
          )}
        </div>
      </div>

      {/* Full-year sheet */}
      {showYear && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowYear(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-extrabold text-white">Your year</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {data?.totalYear ?? 0} contributions · projects, quotes, clients, posts &amp; feedback
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowYear(false)}
                className="h-8 w-8 rounded-xl bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>

            {/* 52 weeks — scrolls horizontally, newest at the right */}
            <div className="overflow-x-auto pb-1" style={{ direction: "rtl" }}>
              <div style={{ direction: "ltr", minWidth: 640 }}>
                <Heatmap byDay={byDay} weeks={52} cellRadius={2} selected={day} onSelect={setDay} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 mt-3">
              <span className="text-[9px] text-zinc-600">Less</span>
              {LEVEL_BG.map((bg, i) => (
                <span key={i} className="inline-block h-[9px] w-[9px] rounded-[2px]" style={{ background: bg }} />
              ))}
              <span className="text-[9px] text-zinc-600">More</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
