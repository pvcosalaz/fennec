"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ArtistEvent, ArtistEventKind } from "@/lib/artistBusiness";
import type { GCalEvent } from "@/lib/googleCalendar";

/* El calendario del artista: el mes completo con TODOS los eventos, pasados y
 * futuros. Nace porque la agenda de lista solo enseña lo que viene, y con dos
 * fechas pasadas y una futura el hub parecia tener un solo evento (Paco
 * 2026-08-25: "agende tres, solamente se ve la ultima").
 *
 * Cada dia pinta sus eventos como fichas tocables; el punto de color dice el
 * tipo (ambar = fecha, gris = grabacion, verde = lanzamiento), el mismo codigo
 * de color en todo el modulo. */

const KIND_DOT: Record<ArtistEventKind, string> = {
  gig: "#f5a623",
  recording: "rgba(255,255,255,.45)",
  release: "#34d399",
};

const pad = (n: number) => String(n).padStart(2, "0");

export default function ArtistCalendar({
  events, lang, onPick, googleEvents = [], footer,
}: {
  events: ArtistEvent[];
  lang: string;
  onPick: (e: ArtistEvent) => void;
  /** Eventos de Google, fantasmas: se ven, no se tocan. Sync una via. */
  googleEvents?: GCalEvent[];
  footer?: React.ReactNode;
}) {
  const hoy = new Date();
  const [vista, setVista] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });

  const porDia = useMemo(() => {
    const m = new Map<string, ArtistEvent[]>();
    for (const e of events) {
      if (!e.eventDate) continue;
      const arr = m.get(e.eventDate) ?? [];
      arr.push(e);
      m.set(e.eventDate, arr);
    }
    return m;
  }, [events]);

  const porDiaG = useMemo(() => {
    const m = new Map<string, GCalEvent[]>();
    for (const g of googleEvents) {
      const arr = m.get(g.day) ?? [];
      arr.push(g);
      m.set(g.day, arr);
    }
    return m;
  }, [googleEvents]);

  /* Semana que arranca en lunes: (getDay()+6)%7 corre el domingo al final. */
  const offset = (new Date(vista.y, vista.m, 1).getDay() + 6) % 7;
  const diasDelMes = new Date(vista.y, vista.m + 1, 0).getDate();
  const celdas: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: diasDelMes }, (_, i) => i + 1),
  ];

  const titulo = new Date(vista.y, vista.m, 1).toLocaleDateString(lang, { month: "long", year: "numeric" });
  /* El 5 de enero de 2026 es lunes: de ahi salen los rotulos L M M J V S D
     en el idioma activo sin escribirlos a mano. */
  const dias = Array.from({ length: 7 }, (_, i) =>
    new Date(2026, 0, 5 + i).toLocaleDateString(lang, { weekday: "narrow" }));

  const esHoy = (d: number) =>
    vista.y === hoy.getFullYear() && vista.m === hoy.getMonth() && d === hoy.getDate();

  function mover(paso: number) {
    setVista(({ y, m }) => {
      const d = new Date(y, m + paso, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  return (
    <div className="px-3 pb-3 pt-1">
      <div className="mb-2 flex items-center justify-between px-1">
        <button type="button" onClick={() => mover(-1)} aria-label="‹"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:text-white active:scale-[0.92]">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-[12.5px] font-bold capitalize text-white">{titulo}</p>
        <button type="button" onClick={() => mover(1)} aria-label="›"
          className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-500 transition hover:text-white active:scale-[0.92]">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dias.map((d, i) => (
          <p key={i} className="pb-1 text-center font-mono text-[8.5px] font-bold uppercase text-zinc-600">{d}</p>
        ))}
        {celdas.map((d, i) => {
          if (d === null) return <div key={`v${i}`} />;
          const clave = `${vista.y}-${pad(vista.m + 1)}-${pad(d)}`;
          const delDia = porDia.get(clave) ?? [];
          const deGoogle = porDiaG.get(clave) ?? [];
          /* Dos fichas por celda; los tuyos primero, Google rellena. */
          const gVisibles = deGoogle.slice(0, Math.max(0, 2 - delDia.length));
          const ocultos = Math.max(0, delDia.length - 2) + (deGoogle.length - gVisibles.length);
          return (
            <div key={d}
              className={`min-h-[52px] rounded-lg border px-1 pb-1 pt-0.5 ${
                esHoy(d) ? "border-accent/40 bg-accent/[0.05]" : "border-white/[0.05] bg-white/[0.015]"
              }`}>
              <p className={`text-right font-mono text-[9px] tabular-nums ${esHoy(d) ? "font-bold text-accent" : "text-zinc-600"}`}>{d}</p>
              <div className="mt-0.5 space-y-0.5">
                {delDia.slice(0, 2).map((e) => (
                  <button key={e.id} type="button" onClick={() => onPick(e)} title={e.title}
                    className="flex w-full items-center gap-1 rounded bg-white/[0.05] px-1 py-0.5 text-left transition hover:bg-white/[0.1] active:scale-[0.97]">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: KIND_DOT[e.kind] }} />
                    <span className="truncate text-[8.5px] leading-tight text-zinc-300">{e.title}</span>
                  </button>
                ))}
                {gVisibles.map((g) => (
                  /* Fantasma: se ve, no se toca. Editarlo es cosa de Google. */
                  <div key={g.id} title={g.title}
                    className="flex w-full items-center gap-1 rounded border border-dashed border-white/[0.12] px-1 py-0.5">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-white/25" />
                    <span className="truncate text-[8.5px] leading-tight text-zinc-500">{g.title}</span>
                  </div>
                ))}
                {ocultos > 0 && (
                  <p className="px-1 font-mono text-[8px] text-zinc-600">+{ocultos}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
