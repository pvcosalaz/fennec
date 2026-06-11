export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

const DAY = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  try {
    const { data: profiles, error: profErr } = await admin
      .from("profiles")
      .select("id, is_pro, is_bot, created_at");
    if (profErr) throw profErr;

    const humans = (profiles ?? []).filter((p) => !p.is_bot);
    const now = Date.now();
    const newUsers7d = humans.filter((p) => now - new Date(p.created_at).getTime() < 7 * DAY).length;

    // Signups per day, last 14 days
    const signupsByDay: { day: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now - i * DAY);
      const key = d.toISOString().slice(0, 10);
      signupsByDay.push({
        day: key,
        count: humans.filter((p) => p.created_at.slice(0, 10) === key).length,
      });
    }

    // Events — may not exist until the migration runs
    let eventsReady = true;
    let active24h = 0, active7d = 0;
    let moduleUsage: { tab: string; count: number }[] = [];
    const { data: events, error: evErr } = await admin
      .from("user_events")
      .select("user_id, type, meta, created_at")
      .gte("created_at", new Date(now - 30 * DAY).toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);

    if (evErr) {
      eventsReady = false;
    } else {
      const ev = events ?? [];
      active24h = new Set(ev.filter((e) => now - new Date(e.created_at).getTime() < DAY).map((e) => e.user_id)).size;
      active7d  = new Set(ev.filter((e) => now - new Date(e.created_at).getTime() < 7 * DAY).map((e) => e.user_id)).size;
      const tabCounts = new Map<string, number>();
      for (const e of ev) {
        if (e.type !== "module_view") continue;
        const tab = (e.meta as { tab?: string })?.tab ?? "unknown";
        tabCounts.set(tab, (tabCounts.get(tab) ?? 0) + 1);
      }
      moduleUsage = [...tabCounts.entries()]
        .map(([tab, count]) => ({ tab, count }))
        .sort((a, b) => b.count - a.count);
    }

    return NextResponse.json({
      eventsReady,
      totalUsers: humans.length,
      proUsers: humans.filter((p) => p.is_pro).length,
      bots: (profiles ?? []).length - humans.length,
      newUsers7d,
      active24h,
      active7d,
      signupsByDay,
      moduleUsage,
    });
  } catch (err) {
    console.error("[admin/overview]", err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
