export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 });

  const admin = getSupabaseAdmin();
  try {
    const { data: events, error } = await admin
      .from("user_events")
      .select("type, meta, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      // table missing pre-migration → empty timeline, not an error
      return NextResponse.json({ events: [] });
    }
    return NextResponse.json({ events: events ?? [] });
  } catch (err) {
    console.error("[admin/user-events]", err);
    return NextResponse.json({ error: "Failed to load events" }, { status: 500 });
  }
}
