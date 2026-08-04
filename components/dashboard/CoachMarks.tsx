"use client";

/* ═══════════════════════════════════════════════════════════════
   COACH MARKS — el recorrido del usuario nuevo, sobre las cosas
   reales.

   Reemplaza al modal de bienvenida (Paco 2026-08-03). Aquel
   explicaba el Fennec dB ANTES de que el usuario lo hubiera visto:
   un muro de texto en el momento de menos contexto posible, asi
   que se cerraba sin leer. Un globo apuntando al numero real hace
   que la explicacion aterrice en el objeto.

   CUATRO pasos, no seis. Un recorrido largo tiene una falla
   conocida: se vuelve algo que la gente clickea para quitarselo de
   encima. Solo va lo que NO se explica solo — Business y Marketing
   ya lo dicen con su nombre.

   El checklist de 5 pasos y el chip de progreso NO se tocan: eso
   sigue siendo lo que guia despues, y desde ahi se puede volver a
   lanzar este recorrido.

   Los anclajes se buscan por `data-coach` en el DOM real, no por
   refs: los elementos viven en tres componentes distintos
   (DashboardDesktop y el dock de DesktopShell) y pasar refs entre
   ellos habria obligado a cablear props por media app.
   ═══════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CoachStep = {
  /** Valor del atributo `data-coach` del elemento al que apunta. */
  anchor: string;
  title: string;
  body: string;
};

export const DASHBOARD_TOUR: CoachStep[] = [
  { anchor: "db",    title: "Your Fennec dB",
    body: "Your signal strength as a producer, measured like decibels. It grows with your real reach." },
  { anchor: "id",    title: "Your Fennec ID",
    body: "Your identity here. The number is yours for good, and the lower it is the earlier you were." },
  { anchor: "contributions", title: "Contributions",
    body: "The work you log through the year. Every square is a day, and you can click one to see what you did." },
  { anchor: "tape",  title: "The Tape",
    body: "Upload a track and get timestamped notes from other producers. Leave notes on theirs too." },
];

const W = 268;
const GAP = 12;

type Caja = { top: number; left: number; width: number; height: number };

export default function CoachMarks({
  steps = DASHBOARD_TOUR,
  onDone,
}: {
  steps?: CoachStep[];
  onDone: () => void;
}) {
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  /* `listo` retrasa un frame la primera pintura para que el globo entre con su
     animacion en vez de aparecer ya colocado. */
  const [listo, setListo] = useState(false);
  /* Alto REAL del globo, medido despues de pintarlo. Antes se estimaba en 150px
     para decidir si cabia debajo del elemento, y un texto de cuatro renglones
     (Contributions) mide mas: el globo se salia por abajo de la ventana
     (Paco 2026-08-03). Estimar el alto de algo que ya esta en el DOM es
     adivinar teniendo la respuesta enfrente. */
  const globoRef = useRef<HTMLDivElement | null>(null);
  const [altoGlobo, setAltoGlobo] = useState(150);

  const paso = steps[i];

  const medir = useCallback(() => {
    const el = document.querySelector(`[data-coach="${paso?.anchor}"]`);
    if (!el) { setCaja(null); return; }
    const r = el.getBoundingClientRect();
    setCaja({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [paso?.anchor]);

  useEffect(() => {
    if (globoRef.current) setAltoGlobo(globoRef.current.offsetHeight);
  });

  useEffect(() => {
    medir();
    setListo(false);
    const t = setTimeout(() => setListo(true), 20);
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [medir]);

  const siguiente = useCallback(() => {
    if (i + 1 < steps.length) setI(i + 1); else onDone();
  }, [i, steps.length, onDone]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
      if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); siguiente(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone, siguiente]);

  /* Si el anclaje de un paso no existe en esta pantalla (por ejemplo La Cinta
     con el dock colapsado), se salta en vez de dejar un globo huerfano en una
     esquina. */
  useEffect(() => {
    if (caja === null && paso) {
      const t = setTimeout(() => { if (!document.querySelector(`[data-coach="${paso.anchor}"]`)) siguiente(); }, 120);
      return () => clearTimeout(t);
    }
  }, [caja, paso, siguiente]);

  if (!paso || !caja) return null;

  /* Debajo del elemento si cabe; si no, encima. El globo crece desde el borde
     que TOCA al elemento, no desde su centro: un panel que se abre desde otro
     sitio se lee como si viniera de otro lado. */
  /* Al COSTADO cuando el anclaje vive pegado al borde izquierdo (el dock).
     Debajo, el globo se metia encima del propio dock y el avatar le tapaba el
     titulo: un globo que oculta lo que esta señalando no señala nada
     (medido 2026-08-03). */
  const alCostado = caja.left + caja.width / 2 < window.innerWidth * 0.2;
  const debajo = caja.top + caja.height + GAP + altoGlobo + 12 < window.innerHeight;
  const cx = caja.left + caja.width / 2;
  const left = alCostado
    ? caja.left + caja.width + GAP
    : Math.min(Math.max(cx - W / 2, 12), window.innerWidth - W - 12);
  /* Tope duro: pase lo que pase, el globo entero cabe en la ventana. La
     posicion preferida (debajo / encima / al costado) es una preferencia, no
     una licencia para salirse de la pantalla. */
  const limite = (y: number) => Math.min(Math.max(y, 12), window.innerHeight - altoGlobo - 12);
  const top = alCostado
    ? limite(caja.top + caja.height / 2 - altoGlobo / 2)
    : debajo ? limite(caja.top + caja.height + GAP) : limite(caja.top - GAP - altoGlobo);
  const origen = alCostado ? "left center" : debajo ? "top center" : "bottom center";

  /* Portal al body: dentro del arbol del shell, el dock crea su propio contexto
     de apilado y quedaba ENCIMA del recorrido por mas z-index que se le pusiera
     (visto en el paso de La Cinta). */
  return createPortal(
    <div className="fixed inset-0 z-[120]">
      {/* Velo. Oscurece lo demas SIN tapar el elemento: el recorte deja su
          rectangulo intacto, que es el punto de señalar en vez de explicar. */}
      <button
        type="button"
        aria-label="Skip tour"
        onClick={onDone}
        className="absolute inset-0 cursor-default"
        style={{
          background: "rgba(6,5,9,0.62)",
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0,
            ${caja.left - 6}px ${caja.top - 6}px,
            ${caja.left - 6}px ${caja.top + caja.height + 6}px,
            ${caja.left + caja.width + 6}px ${caja.top + caja.height + 6}px,
            ${caja.left + caja.width + 6}px ${caja.top - 6}px,
            ${caja.left - 6}px ${caja.top - 6}px)`,
          transition: "clip-path 260ms cubic-bezier(.23,1,.32,1)",
        }}
      />

      {/* Aro sobre el elemento señalado. pointer-events-none para no robarle
          el clic a lo que hay debajo. */}
      <div
        className="pointer-events-none absolute rounded-2xl"
        style={{
          top: caja.top - 6, left: caja.left - 6,
          width: caja.width + 12, height: caja.height + 12,
          border: "1.5px solid rgba(245,166,35,0.55)",
          boxShadow: "0 0 0 1px rgba(0,0,0,0.4), 0 0 26px -6px rgba(245,166,35,0.5)",
          transition: "top 260ms cubic-bezier(.23,1,.32,1), left 260ms cubic-bezier(.23,1,.32,1), width 260ms cubic-bezier(.23,1,.32,1), height 260ms cubic-bezier(.23,1,.32,1)",
        }}
      />

      <div
        className="absolute"
        style={{ top, left }}
      >
        <div
          ref={globoRef}
          key={paso.anchor}
          className="rounded-2xl px-4 py-3.5"
          style={{
            width: W,
            transformOrigin: origen,
            background: "rgba(20,17,13,0.98)",
            border: "1px solid rgba(245,166,35,0.22)",
            boxShadow: "0 20px 44px -18px rgba(0,0,0,0.95)",
            opacity: listo ? 1 : 0,
            transform: listo ? "scale(1) translateY(0)" : "scale(0.96) translateY(4px)",
            transition: "opacity 170ms cubic-bezier(.23,1,.32,1), transform 170ms cubic-bezier(.23,1,.32,1)",
          }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-accent">
            {i + 1} of {steps.length}
          </p>
          <p className="mt-1.5 text-[15px] font-bold leading-none text-white">{paso.title}</p>
          <p className="mt-2 text-[12.5px] leading-snug text-zinc-400">{paso.body}</p>

          <div className="mt-3.5 flex items-center justify-between">
            {/* "Skip" siempre visible. Un recorrido del que no se puede salir
                deja de ser ayuda. */}
            <button
              type="button"
              onClick={onDone}
              className="text-[11.5px] font-semibold text-zinc-500 transition hover:text-zinc-300"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={siguiente}
              className="rounded-full px-3.5 py-1.5 text-[11.5px] font-bold text-black transition hover:brightness-110 active:scale-[0.97]"
              style={{ background: "#f5a623" }}
            >
              {i + 1 === steps.length ? "Got it" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
