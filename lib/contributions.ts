// Contributions — the GitHub-style activity graph on the dashboard.
// A "contribution" is real work logged in Fennec: projects, quotes and clients
// created in the Business hub, posts in Community, feedback given on other
// people's tracks, and tracks uploaded for review. Deliberately NOT app-opens
// or module views: the graph rewards output, not screen time.
// (Decided with Paco 2026-07-22 — the dB narrative shifts to activity-as-engine,
// reach as a bonus multiplier; this graph is the visual evidence.)

import { supabase } from "@/lib/supabase";
import type { Project, Quote, Client } from "@/lib/pricingData";

/** De qué está hecha una contribución. El heatmap solo contaba, así que un
 *  cuadrito encendido no decía nada: "veo puros cuadritos que no sé qué
 *  representan" (Paco 2026-08-03). Guardando el tipo, un día se puede leer. */
export type ContributionKind = "quote" | "project" | "client" | "post" | "feedback" | "track";

/** Cuántas de cada tipo hubo ese día. */
export type DayDetail = Partial<Record<ContributionKind, number>>;

export type ContributionDays = {
  /** ISO day (YYYY-MM-DD, local time) → contribution count */
  byDay: Map<string, number>;
  /** ISO day → desglose por tipo. Es lo que se muestra al picarle a un día. */
  detail: Map<string, DayDetail>;
  /** Total contributions in the last 365 days */
  totalYear: number;
  /** Current streak in days (counts today OR yesterday as alive) */
  streak: number;
};

/** Local-time ISO day key. Using local time (not UTC) so a beat finished at
 *  11pm in Monterrey lands on the day the user actually worked. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addTimestamp(
  byDay: Map<string, number>,
  detail: Map<string, DayDetail>,
  ts: number,
  cutoff: number,
  kind: ContributionKind,
) {
  if (!Number.isFinite(ts) || ts < cutoff) return;
  const k = dayKey(new Date(ts));
  byDay.set(k, (byDay.get(k) ?? 0) + 1);
  const d = detail.get(k) ?? {};
  d[kind] = (d[kind] ?? 0) + 1;
  detail.set(k, d);
}

/**
 * Builds the day-bucketed contribution history for the past year.
 * Business rows come in pre-loaded (the Dashboard already fetches them);
 * community/audio activity is queried here with minimal columns.
 * Every query is best-effort: a failing source never blanks the graph.
 */
export async function fetchContributionDays(
  userId: string,
  projects: Project[],
  quotes: Quote[],
  clients: Client[],
): Promise<ContributionDays> {
  const now = Date.now();
  const cutoff = now - 365 * 24 * 60 * 60 * 1000;
  const cutoffIso = new Date(cutoff).toISOString();
  const byDay = new Map<string, number>();
  const detail = new Map<string, DayDetail>();

  // Business — already in memory
  for (const p of projects) addTimestamp(byDay, detail, p.createdAt, cutoff, "project");
  for (const q of quotes)   addTimestamp(byDay, detail, q.createdAt, cutoff, "quote");
  for (const c of clients)  addTimestamp(byDay, detail, c.createdAt, cutoff, "client");

  // Community + audio — created_at only, capped, best-effort
  const sources: { table: string; userCol: string; kind: ContributionKind }[] = [
    { table: "posts",           userCol: "user_id", kind: "post" },     // community posts
    { table: "review_comments", userCol: "user_id", kind: "feedback" }, // feedback given on tracks
    { table: "project_reviews", userCol: "user_id", kind: "track" },    // tracks uploaded for review
  ];
  await Promise.all(sources.map(async ({ table, userCol, kind }) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("created_at")
        .eq(userCol, userId)
        .gte("created_at", cutoffIso)
        .limit(1000);
      if (error || !data) return;
      for (const row of data) addTimestamp(byDay, detail, new Date(row.created_at as string).getTime(), cutoff, kind);
    } catch { /* best-effort */ }
  }));

  /* Año CALENDARIO, no últimos 365 días: el pie dice "this year" y la rejilla
     ahora va de enero a diciembre, así que el número tiene que contar lo
     mismo que se está viendo. */
  const anio = String(new Date().getFullYear());
  let totalYear = 0;
  for (const [k, n] of byDay) if (k.startsWith(anio)) totalYear += n;

  // Streak: walk back from today; an empty TODAY doesn't break it (the day
  // isn't over), but an empty yesterday does.
  let streak = 0;
  const cursor = new Date();
  if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { byDay, detail, totalYear, streak };
}

/**
 * Rejilla del AÑO CALENDARIO: de enero a diciembre del año en curso.
 *
 * La versión anterior era una ventana móvil de 52 semanas hacia atrás, así que
 * en agosto la gráfica empezaba en agosto del año pasado. Pero el pie decía
 * "this year", o sea que el rótulo y la rejilla contaban cosas distintas
 * (Paco 2026-08-03). Un año que empieza en enero es lo que espera cualquiera.
 *
 * Se dibuja el año COMPLETO, no solo hasta hoy: así los meses siempre están en
 * el mismo sitio, el ancho no cambia con el paso del año, y se ve el año
 * llenándose. Los días que aún no llegan van transparentes (`future`), y los
 * de relleno para cuadrar las semanas van marcados (`outside`) para no
 * leerse como días sin actividad.
 */
export function buildYearGrid(byDay: Map<string, number>, year = new Date().getFullYear()) {
  const hoy = new Date();
  const primero = new Date(year, 0, 1);
  const ultimo = new Date(year, 11, 31);

  // Arranca en el domingo de la semana del 1 de enero, para que cada columna
  // sea una semana entera.
  const inicio = new Date(primero);
  inicio.setDate(inicio.getDate() - inicio.getDay());

  type Celda = {
    key: string; count: number; level: 0 | 1 | 2 | 3 | 4;
    month: number; outside: boolean; future: boolean;
  };
  const cols: Celda[][] = [];
  const cursor = new Date(inicio);
  while (cursor <= ultimo || cursor.getDay() !== 0) {
    const col: Celda[] = [];
    for (let d = 0; d < 7; d++) {
      const fecha = new Date(cursor);
      fecha.setDate(cursor.getDate() + d);
      const key = dayKey(fecha);
      const count = byDay.get(key) ?? 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
      col.push({
        key, count, level,
        month: fecha.getMonth(),
        outside: fecha.getFullYear() !== year,
        future: fecha > hoy,
      });
    }
    cols.push(col);
    cursor.setDate(cursor.getDate() + 7);
    if (cols.length > 54) break;
  }
  return cols;
}

/**
 * Grid for the heatmap: `weeks` columns × 7 rows, ending today.
 * Each cell: its day key, count, and intensity level 0–4 (quartile-ish fixed
 * thresholds — musicians log a handful of items a day, not dozens).
 */
export function buildHeatmapGrid(byDay: Map<string, number>, weeks: number) {
  const today = new Date();
  // End the grid on the current weekday; start weeks*7-1 days earlier.
  const days = weeks * 7;
  /* Misma forma que buildYearGrid para que la tarjeta pueda pintar cualquiera
     de los dos sin ramificar. En la tira móvil nunca hay relleno ni futuro. */
  type Celda = {
    key: string; count: number; level: 0 | 1 | 2 | 3 | 4;
    month: number; outside: boolean; future: boolean;
  };
  const cells: Celda[][] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  for (let w = 0; w < weeks; w++) {
    const col: Celda[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) break;
      const key = dayKey(date);
      const count = byDay.get(key) ?? 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
      col.push({ key, count, level, month: date.getMonth(), outside: false, future: false });
    }
    cells.push(col);
  }
  return cells;
}
