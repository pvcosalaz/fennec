// Contributions — the GitHub-style activity graph on the dashboard.
// A "contribution" is real work logged in Fennec: projects, quotes and clients
// created in the Business hub, posts in Community, feedback given on other
// people's tracks, and tracks uploaded for review. Deliberately NOT app-opens
// or module views: the graph rewards output, not screen time.
// (Decided with Paco 2026-07-22 — the dB narrative shifts to activity-as-engine,
// reach as a bonus multiplier; this graph is the visual evidence.)

import { supabase } from "@/lib/supabase";
import type { Project, Quote, Client } from "@/lib/pricingData";

export type ContributionDays = {
  /** ISO day (YYYY-MM-DD, local time) → contribution count */
  byDay: Map<string, number>;
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

function addTimestamp(byDay: Map<string, number>, ts: number, cutoff: number) {
  if (!Number.isFinite(ts) || ts < cutoff) return;
  const k = dayKey(new Date(ts));
  byDay.set(k, (byDay.get(k) ?? 0) + 1);
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

  // Business — already in memory
  for (const p of projects) addTimestamp(byDay, p.createdAt, cutoff);
  for (const q of quotes)   addTimestamp(byDay, q.createdAt, cutoff);
  for (const c of clients)  addTimestamp(byDay, c.createdAt, cutoff);

  // Community + audio — created_at only, capped, best-effort
  const sources: { table: string; userCol: string }[] = [
    { table: "posts",           userCol: "user_id" }, // community posts
    { table: "review_comments", userCol: "user_id" }, // feedback given on tracks
    { table: "project_reviews", userCol: "user_id" }, // tracks uploaded for review
  ];
  await Promise.all(sources.map(async ({ table, userCol }) => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("created_at")
        .eq(userCol, userId)
        .gte("created_at", cutoffIso)
        .limit(1000);
      if (error || !data) return;
      for (const row of data) addTimestamp(byDay, new Date(row.created_at as string).getTime(), cutoff);
    } catch { /* best-effort */ }
  }));

  let totalYear = 0;
  for (const n of byDay.values()) totalYear += n;

  // Streak: walk back from today; an empty TODAY doesn't break it (the day
  // isn't over), but an empty yesterday does.
  let streak = 0;
  const cursor = new Date();
  if (!byDay.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return { byDay, totalYear, streak };
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
  const cells: { key: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[][] = [];
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  for (let w = 0; w < weeks; w++) {
    const col: { key: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      if (date > today) break;
      const key = dayKey(date);
      const count = byDay.get(key) ?? 0;
      const level = count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count <= 4 ? 3 : 4;
      col.push({ key, count, level });
    }
    cells.push(col);
  }
  return cells;
}
