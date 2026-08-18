// Señales del dashboard — lo que de verdad pide tu atención hoy.
//
// [2026-08-17] El panel derecho eran TRES renglones fijos: nota, cotizaciones,
// próximo post. Siempre los mismos tres, dijeran algo o no, así que dos de cada
// tres días el panel no decía nada ("No open quotes · Nothing scheduled").
// Paco lo quiso como actividad de verdad, con recordatorios accionables.
//
// Ahora es una lista PRIORIZADA: se generan todas las señales que aplican y se
// muestran las más urgentes. Un día tranquilo enseña pocas; un día cargado
// enseña las que importan. El orden lo decide `peso`, no el orden del código.

import type { Project, Quote } from "@/lib/pricingData";
import { projectMoney, paymentsTotal } from "@/lib/pricingData";

export type SignalTab = "pricing" | "contenido" | "ideas" | "community";

export type Signal = {
  id: string;
  /** Clave i18n del texto, con sus variables ya resueltas por el llamador. */
  texto: string;
  /** Texto del enlace a la derecha. */
  accion: string;
  tab: SignalTab;
  /** Mayor = más arriba. Dinero sin cobrar pesa más que un post programado. */
  peso: number;
  /** Marca las que son un aviso, no una novedad: se pintan en ámbar. */
  alerta?: boolean;
};

const DIA = 24 * 60 * 60 * 1000;

/** Días transcurridos desde un timestamp, una fecha suelta (YYYY-MM-DD) o un
 *  ISO completo. Las tres formas llegan aquí: los proyectos guardan la entrega
 *  como fecha suelta y Supabase devuelve created_at con hora. Concatenar
 *  "T00:00:00" a un ISO que ya la trae da Invalid Date, y el NaN resultante
 *  envenenaba el orden del panel: un comentario de hoy se colaba encima de un
 *  proyecto sin anticipo (visto en pantalla, 2026-08-17). */
export function diasDesde(t: number | string): number {
  let ms: number;
  if (typeof t === "number") ms = t;
  else ms = new Date(t.includes("T") ? t : `${t}T00:00:00`).getTime();
  if (!Number.isFinite(ms)) return 0;
  return Math.floor((Date.now() - ms) / DIA);
}

export type SignalInputs = {
  projects: Project[];
  quotes: Quote[];
  latestNote: string | null;
  /** Posts programados del módulo de Marketing. */
  scheduled: { title: string; date: string; status: string }[];
  /** Comentarios recientes de otros en tus posts. */
  comments: { id: string; content: string; createdAt: string; username: string | null }[];
  /** Traductor ya ligado al idioma activo. */
  t: (k: string, v?: Record<string, unknown>) => string;
};

export function buildSignals(i: SignalInputs): Signal[] {
  const out: Signal[] = [];
  const activos = i.projects.filter((p) => p.status !== "paid");

  // ── Nota nueva en tu track ──
  if (i.latestNote) {
    out.push({ id: "note", texto: i.t("newNote"), accion: i.t("myTracksArrow"), tab: "ideas", peso: 70 });
  }

  // ── Alguien comentó tu post ──
  for (const c of i.comments.slice(0, 2)) {
    out.push({
      id: `comment-${c.id}`,
      texto: i.t("sgComento", { user: c.username ? `@${c.username}` : i.t("sgAlguien") }),
      accion: i.t("sgVerArrow"),
      tab: "community",
      peso: 65 - diasDesde(c.createdAt),
    });
  }

  // ── Proyecto en producción SIN anticipo: lo más caro de olvidar ──
  for (const p of activos.filter((p) => p.price > 0 && paymentsTotal(p.payments) === 0).slice(0, 2)) {
    out.push({
      id: `deposit-${p.id}`,
      texto: i.t("sgSinAnticipo", { name: p.name }),
      accion: i.t("sgCobrarArrow"),
      tab: "pricing",
      peso: 100,
      alerta: true,
    });
  }

  // ── Cotización enviada y sin respuesta hace una semana ──
  for (const q of i.quotes.filter((q) => q.status === "sent" && diasDesde(q.createdAt) >= 7).slice(0, 2)) {
    out.push({
      id: `stale-${q.id}`,
      texto: i.t("sgCotizacionSinRespuesta", { name: q.projectName || q.clientName, days: diasDesde(q.createdAt) }),
      accion: i.t("sgSeguirArrow"),
      tab: "pricing",
      peso: 90,
      alerta: true,
    });
  }

  // ── Borrador sin enviar ──
  const borradores = i.quotes.filter((q) => q.status === "draft").length;
  if (borradores > 0) {
    out.push({
      id: "drafts",
      texto: i.t("sgBorradores", { count: borradores }),
      accion: i.t("sendArrow"),
      tab: "pricing",
      peso: 80,
      alerta: true,
    });
  }

  // ── Entregado pero sin cobrar del todo ──
  for (const p of activos.filter((p) => p.status === "delivered" && projectMoney(p).pending > 0).slice(0, 2)) {
    out.push({
      id: `unpaid-${p.id}`,
      texto: i.t("sgEntregadoSinCobrar", { name: p.name }),
      accion: i.t("sgCobrarArrow"),
      tab: "pricing",
      peso: 95,
      alerta: true,
    });
  }

  // ── Entrega encima o vencida ──
  for (const p of activos.filter((p) => p.deadline && p.status !== "delivered")) {
    const faltan = -diasDesde(p.deadline);
    if (faltan > 3) continue;
    out.push({
      id: `deadline-${p.id}`,
      texto: faltan < 0
        ? i.t("sgVencido", { name: p.name, days: Math.abs(faltan) })
        : i.t("sgEntregaCerca", { name: p.name, days: faltan }),
      accion: i.t("viewArrow"),
      tab: "pricing",
      peso: faltan < 0 ? 98 : 85,
      alerta: true,
    });
  }

  // ── Post programado para hoy ──
  const hoy = new Date().toISOString().slice(0, 10);
  const deHoy = i.scheduled.filter((s) => s.status !== "done" && s.date === hoy);
  if (deHoy.length) {
    out.push({
      id: "post-today",
      texto: i.t("sgPostHoy", { count: deHoy.length }),
      accion: i.t("calendarArrow"),
      tab: "contenido",
      peso: 75,
    });
  }

  return out.sort((a, b) => (Number.isFinite(b.peso) ? b.peso : 0) - (Number.isFinite(a.peso) ? a.peso : 0));
}

/** Posts programados que caen de aquí al domingo. */
export function programadosEstaSemana(posts: { date: string; status: string }[]): number {
  const hoy = new Date();
  const fin = new Date(hoy);
  fin.setDate(fin.getDate() + (7 - hoy.getDay()));
  const a = hoy.toISOString().slice(0, 10);
  const b = fin.toISOString().slice(0, 10);
  return posts.filter((p) => p.status !== "done" && p.date >= a && p.date <= b).length;
}
