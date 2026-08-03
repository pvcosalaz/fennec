"use client";

/* ═══════════════════════════════════════════════════════════════
   INDUSTRY NEWS — lo que pasó hoy en el negocio, con imagen.

   Sustituye al bloque de comunidad en el dashboard (Paco 2026-08-02).
   El razonamiento de aquel sigue valiendo —una pantalla hecha solo de
   tus propios números no da motivo para volver durante el día— pero la
   comunidad de un producto joven está vacía a ciertas horas, mientras
   que la industria publica todos los días. Y la foto es lo que hace
   que la pantalla se sienta viva en vez de ser una lista de texto.

   La fuente ya existía: /api/news junta 7 feeds reales (Music Business
   Worldwide, Hypebot, MusicTech, Sound On Sound, KVR, BPB, MusicRadar)
   y ya extraía la imagen de cada nota. Aquí solo se consume.

   ROTACIÓN: el endpoint cachea 2h en el servidor, así que abrir la app
   diez veces seguidas no dispara diez lecturas de RSS. Lo que cambia en
   cada visita es CUÁLES de las notas frescas te tocan: se elige una
   ventana distinta según la hora, para que la pantalla no se sienta
   congelada sin gastar red de más.
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { Tile } from "@/components/desktop/ui";
import type { NewsItem } from "@/app/api/news/route";

/** Alto real de una fila, medido en el harness. Se usa para decidir cuántas
 *  caben; si cambia el diseño de la fila, cambia esto. */
const ROW_H = 58;

/** "3h" / "2d" — misma forma compacta que usa el resto del dashboard. */
function ago(iso: string): string {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.floor((Date.now() - t) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Qué notas mostrar en esta visita.
 *
 * No es aleatorio a propósito: `Math.random()` en el render daría un
 * resultado distinto en el servidor y en el cliente, y React marcaría
 * error de hidratación. Un desfase derivado de la hora es estable dentro
 * de cada render y aun así cambia solo a lo largo del día.
 */
function pickWindow<T>(items: T[], count: number, bucket: number, rotateWithin?: number): T[] {
  if (items.length <= count) return items;
  /* La rotación se hace SOLO dentro del tramo con foto (rotateWithin): si el
     desfase pudiera caer en las notas sin imagen, unas visitas saldrían con
     fotos y otras no, y el widget se sentiría roto en vez de vivo. */
  const span = Math.max(count, Math.min(rotateWithin ?? items.length, items.length));
  const start = (bucket * count) % span;
  return Array.from({ length: count }, (_, i) => items[(start + i) % span]);
}

function Thumb({ item }: { item: NewsItem }) {
  const [broken, setBroken] = useState(false);

  /* Sin imagen (o rota) NO se deja el hueco: se pone una placa con la
     inicial de la fuente. Un widget cuya mitad de tarjetas tienen foto y
     la otra mitad no se ve descuidado; con la placa mantiene el ritmo. */
  if (!item.image || broken) {
    return (
      <div className="grid h-full w-full place-items-center bg-white/[0.05] text-[13px] font-bold text-zinc-500">
        {item.source.slice(0, 1).toUpperCase()}
      </div>
    );
  }
  /* <img> directo, SIN pasar por /api/img-proxy.
     Probé el proxy y fue un error: su allowlist son dominios de artículo, no
     los CDN donde viven las fotos, así que bloqueaba con 403 a MusicRadar
     (futurecdn.net), Hypebot (ghost.io) y Sound On Sound (cloudfront) — 3 de
     los 5 hosts reales. Medido el 2026-08-03: ninguna de las 54 URLs de imagen
     de estos feeds está protegida contra hotlink, todas son https y el CSP del
     proyecto ya las permite. El proxy solo estorbaba. */
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.image}
      alt=""
      loading="lazy"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
    />
  );
}

function Loading({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col divide-y divide-white/[0.05]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5 first:pt-0">
          <div className="h-[46px] w-[64px] flex-shrink-0 animate-pulse rounded-lg bg-white/[0.05]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-[9px] w-20 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-[9px] animate-pulse rounded bg-white/[0.04]" style={{ width: `${80 - i * 10}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function IndustryNews({
  min = 2,
  max = 4,
  onOpen,
}: {
  /** Mínimo de notas aunque el hueco sea chico, y máximo aunque sobre. */
  min?: number;
  max?: number;
  onOpen?: () => void;
}) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: NewsItem[]) => { if (alive) setItems(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) { setItems([]); setFailed(true); } });
    return () => { alive = false; };
  }, []);

  /* El desfase se calcula tras montar: en el servidor no hay "ahora" del
     usuario, y calcularlo durante el render rompería la hidratación. */
  const [bucket, setBucket] = useState(0);
  useEffect(() => { setBucket(Math.floor(Date.now() / (3 * 60 * 60 * 1000))); }, []);

  /* Cuántas notas caben, medido en vivo.
     El dashboard no scrollea, así que este widget se lleva el alto sobrante y
     ese sobrante cambia con el tamaño de la ventana: en una laptop chica entran
     dos, en un monitor grande cuatro. Un número fijo dejaba media fila cortada
     abajo, que es la clase de detalle que hace que una pantalla se vea rota. */
  const listRef = useRef<HTMLDivElement | null>(null);
  const [rows, setRows] = useState(min);
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const fit = Math.floor(el.clientHeight / ROW_H);
      setRows(Math.max(min, Math.min(max, fit)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min, max]);

  /* Se eligen las más recientes QUE TENGAN FOTO, no las más recientes a secas.
     Medido el 2026-08-03: 13 de 18 notas traen imagen, y las 5 sin foto son
     todas de Music Business Worldwide, cuyo RSS no incluye ninguna. Con ese
     margen siempre hay material para llenar tres huecos, y así el widget no
     depende de qué publicó MBW hoy. Si un día no alcanzan, se completa con las
     que no tienen: mejor una tarjeta sin foto que un hueco. */
  const withPhoto = (items ?? []).filter((n) => !!n.image);
  const rest = (items ?? []).filter((n) => !n.image);
  const pool = [...withPhoto, ...rest];
  const visible = items ? pickWindow(pool, rows, bucket, withPhoto.length) : [];

  return (
    <Tile
      label="Industry today"
      className="flex min-h-0 flex-col"
      action={
        onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="text-[11px] font-semibold text-accent transition hover:brightness-110"
          >
            All news →
          </button>
        )
      }
    >
      <div ref={listRef} className="min-h-0 flex-1 overflow-hidden">
      {items === null && <Loading rows={rows} />}

      {items !== null && visible.length === 0 && (
        <div className="py-5">
          <p className="text-[12.5px] text-zinc-500">
            {failed ? "Couldn't reach the newsroom right now." : "No headlines right now."}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {visible.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-w-0 items-center gap-3 py-2.5 text-left transition first:pt-0 hover:opacity-95"
            >
              <div className="h-[46px] w-[64px] flex-shrink-0 overflow-hidden rounded-lg bg-black/30">
                <Thumb item={item} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[12.5px] font-medium leading-snug text-zinc-200 transition group-hover:text-white">
                  {item.headline}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="truncate">{item.source}</span>
                  {item.pubDate && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="flex-shrink-0">{ago(item.pubDate)}</span>
                    </>
                  )}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
      </div>
    </Tile>
  );
}
