"use client";

/* ═══════════════════════════════════════════════════════════════
   INDUSTRY NEWS — dos tarjetas cuadradas, la nota como protagonista.

   Empezo siendo una lista de renglones con miniatura. Se sentia
   "widget de lista" y la foto quedaba de adorno a 64px (Paco
   2026-08-03). Ahora la fotografia ES la tarjeta y el titular va
   encima: ocupa menos alto, se ve mas y da la sensacion de que el
   dashboard cambia solo.

   La fuente ya existia: /api/news junta 6 feeds reales de la
   industria y extrae la imagen de cada nota.

   ROTACION: el endpoint cachea 2h en el servidor, asi que abrir la
   app diez veces no dispara diez lecturas de RSS. Lo que cambia en
   cada visita es CUALES notas te tocan.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import type { NewsItem } from "@/app/api/news/route";

/* Recopilatorios, no noticias.
   Varios feeds publican a diario un "todo lo ultimo" que no cuenta nada por si
   solo: Paco vio "MUSIC INDUSTRY NEWS: All The Latest" ocupando el widget y no
   dice nada (2026-08-03). No se descartan —a veces son lo unico que hay— pero
   pasan al final de la fila. */
const RECOPILATORIO =
  /all the latest|round-?up|roundup|morning coffee|weekly (brief|digest|wrap)|daily (brief|digest)|this week in|news digest/i;

function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Ventana estable: nada de Math.random(), que daria un resultado distinto en
 *  servidor y cliente y romperia la hidratacion. */
function pickWindow<T>(items: T[], count: number, bucket: number): T[] {
  if (items.length <= count) return items;
  const start = (bucket * count) % items.length;
  return Array.from({ length: count }, (_, i) => items[(start + i) % items.length]);
}

function Card({ item }: { item: NewsItem }) {
  const [broken, setBroken] = useState(false);
  const conFoto = !!item.image && !broken;

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex min-w-0 flex-col justify-end overflow-hidden rounded-2xl"
      style={{
        /* Alto elástico, no aspect-square. Cuadradas fijas pedían 216px y se
           comían la fila de Contributions; a 720px de ventana dejaban a "Today
           on Fennec" sin su tercera fila.
           La proporción la marca la ventana: 10vh, con tope de 150. En una
           laptop chica quedan compactas y en un monitor grande se acercan al
           cuadrado, que es la forma que se pidió, sin que ninguna de las dos
           reviente la rejilla (Paco 2026-08-03). */
        height: "clamp(58px, 10vh, 150px)",
        background: "var(--fx-tile-bg, linear-gradient(180deg, rgba(255,255,255,0.048), rgba(255,255,255,0.012)))",
        boxShadow: "var(--fx-tile-shadow, inset 0 1px 0 rgba(255,255,255,0.075), 0 18px 40px -24px rgba(0,0,0,0.75))",
        backdropFilter: "var(--fx-tile-blur, none)",
        WebkitBackdropFilter: "var(--fx-tile-blur, none)",
      }}
    >
      {conFoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
        />
      )}

      {/* El velo va SOBRE la foto y solo en la mitad de abajo: la imagen se
          sigue viendo arriba y el titular se apoya en material oscuro.
          Sin foto no hace falta, el panel ya es opaco. */}
      {conFoto && (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,9,13,0.10) 0%, rgba(10,9,13,0.55) 48%, rgba(10,9,13,0.92) 100%)",
          }}
        />
      )}

      <div className="relative p-2.5">
        <p className="line-clamp-3 text-[11px] font-semibold leading-snug text-white">
          {item.headline}
        </p>
        <p className="mt-1 flex items-center gap-1 text-[8.5px] uppercase tracking-[0.08em] text-zinc-400">
          <span className="truncate">{item.source}</span>
          {item.pubDate && (
            <>
              <span className="text-zinc-600">·</span>
              <span className="flex-shrink-0">{ago(item.pubDate)}</span>
            </>
          )}
        </p>
      </div>
    </a>
  );
}

function Skeleton() {
  return (
    <div
      className="animate-pulse rounded-2xl"
      style={{ height: "clamp(58px, 10vh, 150px)", background: "var(--fx-tile-bg, rgba(255,255,255,0.04))" }}
    />
  );
}

export default function IndustryNews({
  count = 4,
  onOpen,
}: {
  count?: number;
  onOpen?: () => void;
}) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: NewsItem[]) => { if (alive) setItems(Array.isArray(d) ? d : []); })
      .catch(() => { if (alive) { setItems([]); setFailed(true); } });
    return () => { alive = false; };
  }, []);

  const [bucket, setBucket] = useState(0);
  useEffect(() => { setBucket(Math.floor(Date.now() / (3 * 60 * 60 * 1000))); }, []);

  /* Orden de preferencia: nota real CON foto, nota real sin foto, y al final
     los recopilatorios. La rotacion ocurre dentro del primer grupo para que no
     haya visitas con foto y visitas sin. */
  const all = items ?? [];
  const buenas = all.filter((n) => n.image && !RECOPILATORIO.test(n.headline));
  const resto = all.filter((n) => !buenas.includes(n));
  const visible = items ? pickWindow(buenas, count, bucket).concat(
    buenas.length >= count ? [] : resto.slice(0, count - buenas.length),
  ) : [];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          Industry today
        </span>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="text-[10.5px] font-semibold text-accent transition hover:brightness-110"
          >
            All news →
          </button>
        )}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
        {items === null && Array.from({ length: count }).map((_, i) => <Skeleton key={i} />)}
        {items !== null && visible.length === 0 && (
          <p className="col-span-full py-4 text-[12px] text-zinc-500">
            {failed ? "Couldn't reach the newsroom right now." : "No headlines right now."}
          </p>
        )}
        {visible.map((item) => <Card key={item.id} item={item} />)}
      </div>
    </div>
  );
}
