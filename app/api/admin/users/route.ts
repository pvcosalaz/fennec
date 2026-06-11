export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = getSupabaseAdmin();
  try {
    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, username, display_name, role, country, is_pro, is_bot, fennec_db_score, created_at, ig_followers, tiktok_followers, yt_subscribers")
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Last activity per user — newest event wins (events are optional pre-migration)
    const lastActive: Record<string, string> = {};
    const { data: events } = await admin
      .from("user_events")
      .select("user_id, created_at")
      .order("created_at", { ascending: false })
      .limit(5000);
    for (const e of events ?? []) {
      if (!lastActive[e.user_id]) lastActive[e.user_id] = e.created_at;
    }

    const users = (profiles ?? [])
      .filter((p) => !p.is_bot)
      .map((p) => ({ ...p, last_active: lastActive[p.id] ?? null }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/users]", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}
