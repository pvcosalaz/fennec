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
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
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

function Card({ item, denso = false }: { item: NewsItem; denso?: boolean }) {
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
        height: "100%",
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
          /* Desaturadas y apagadas en reposo. Cinco fotos a todo color en la
             fila de abajo eran lo mas ruidoso de la pantalla, y estaban justo
             donde deberia haber menos ruido (Paco 2026-08-03). Asi la foto
             aporta textura y el TITULAR manda; el color vuelve al pasar encima,
             que es cuando esa nota si te interesa. */
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700 group-hover:scale-[1.04] group-hover:saturate-100 group-hover:opacity-100"
          /* Subido de 0.15/0.55 a 0.55/0.70 (Paco 2026-08-03). Al 15% de
             saturacion las fotos eran practicamente grises y las noticias
             perdian el gancho; a color pleno eran la fila mas ruidosa de la
             pantalla, que es por lo que se bajaron. A la mitad se distingue de
             que trata cada nota sin que la fila compita con el resto. El color
             pleno se sigue reservando para el hover. */
          style={{ filter: "saturate(0.55) contrast(1.04)", opacity: 0.70 }}
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

      <div className={`relative ${denso ? "p-2" : "p-2.5"}`}>
        <p className={`${denso ? "line-clamp-2 text-[10.5px]" : "line-clamp-3 text-[11px]"} font-semibold leading-snug text-white`}>
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
      className="h-full animate-pulse rounded-2xl"
      style={{ background: "var(--fx-tile-bg, rgba(255,255,255,0.04))" }}
    />
  );
}

export default function IndustryNews({
  count = 4,
  columnas,
  onOpen,
}: {
  count?: number;
  /** Columnas de la rejilla. Por defecto una por nota (la tira horizontal de
   *  ancho completo). Con 2 quedan 2x2, que es lo que cabe en la celda angosta
   *  de la derecha cuando las noticias suben a la primera fila. */
  columnas?: number;
  onOpen?: () => void;
}) {
  const cols = columnas ?? count;
  const denso = cols < count;
  const { t } = useTranslation();
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
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-1.5 flex flex-shrink-0 items-center justify-between">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-500">
          {t("industryToday")}
        </span>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="text-[10.5px] font-semibold text-zinc-500 transition hover:text-accent"
          >
            {t("allNews")}
          </button>
        )}
      </div>

      <div
        className={`grid min-h-0 flex-1 ${denso ? "gap-2" : "gap-3"}`}
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${Math.ceil(count / cols)}, minmax(0, 1fr))`,
          /* El tope de alto es solo para la tira ancha, donde sin el las
             tarjetas se estiraban a media pantalla. En la celda angosta el alto
             lo manda la fila (la altura de la tarjeta de ID), asi que estorba. */
          ...(denso ? null : { maxHeight: 190 }),
        }}
      >
        {items === null && Array.from({ length: count }).map((_, i) => <Skeleton key={i} />)}
        {items !== null && visible.length === 0 && (
          <p className="col-span-full py-4 text-[12px] text-zinc-500">
            {failed ? t("newsUnreachable") : t("noHeadlines")}
          </p>
        )}
        {visible.map((item) => <Card key={item.id} item={item} denso={denso} />)}
      </div>
    </div>
  );
}
