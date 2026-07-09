export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { fetchNewsItems } from "@/lib/newsData";
// Admin client: cached_content is RLS-protected — anon upserts fail silently
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
export type { NewsItem } from "@/lib/newsData";

const CACHE_KEY = "news_items";
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    // Check Supabase cache first
    const { data: cached } = await supabase
      .from("cached_content")
      .select("data, updated_at")
      .eq("key", CACHE_KEY)
      .single();

    if (cached) {
      const age = Date.now() - new Date(cached.updated_at).getTime();
      if (age < CACHE_TTL_MS) {
        console.log("[news] serving from cache");
        return NextResponse.json(cached.data, {
          headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
        });
      }
    }

    // Cache stale or missing — fetch fresh data
    const items = await fetchNewsItems();

    // Save to cache (best-effort)
    if (items.length > 0) {
      await supabase
        .from("cached_content")
        .upsert({ key: CACHE_KEY, data: items, updated_at: new Date().toISOString() });
    }

    return NextResponse.json(items, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
