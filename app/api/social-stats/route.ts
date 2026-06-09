import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scrapeSocialStats, normalizeHandles, hasApifyToken } from "@/lib/socialStats";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://drmhwzxytwmkpfnjwmra.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "no userId" }, { status: 400 });

  // Auth check — use getUser with the bearer token
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "No auth token" }, { status: 401 });
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized", detail: authError?.message }, { status: 401 });
  }
  if (user.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Get handles from profile
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("instagram, tiktok, youtube_url")
    .eq("id", userId)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found", detail: profileError?.message }, { status: 404 });
  }

  const { igHandle, ttHandle, ytHandle } = normalizeHandles(profile);

  // No handles saved → nothing to scrape
  if (!igHandle && !ttHandle && !ytHandle) {
    return NextResponse.json({
      ig_followers: null, tiktok_followers: null, yt_subscribers: null,
      synced_at: new Date().toISOString(),
      error: "no_handles",
    });
  }

  // Apify token not configured on this environment
  if (!hasApifyToken()) {
    console.error("[social-stats] APIFY_API_TOKEN not set");
    return NextResponse.json({
      ig_followers: null, tiktok_followers: null, yt_subscribers: null,
      synced_at: new Date().toISOString(),
      error: "apify_not_configured",
    });
  }

  const stats = await scrapeSocialStats(profile);
  const syncedAt = new Date().toISOString();

  const { error: updateError } = await supabaseAdmin.from("profiles").update({
    ig_followers:     stats.ig_followers,
    tiktok_followers: stats.tiktok_followers,
    yt_subscribers:   stats.yt_subscribers,
    social_synced_at: syncedAt,
  }).eq("id", userId);

  if (updateError) console.error("[social-stats] DB update error:", updateError.message);

  return NextResponse.json({ ...stats, synced_at: syncedAt });
}
