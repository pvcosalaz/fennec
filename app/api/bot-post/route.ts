// app/api/bot-post/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { markAsPosted } from "@/lib/botDb";
import { rewriteWithClaude, pickFormat } from "@/lib/botContent";
import type { NewsItem } from "@/app/api/news/route";
import type { PostCategory } from "@/lib/communityTypes";

const BOT_UUID = "f0000000-0000-0000-0000-000000000001";

const CATEGORY_MAP: Record<string, PostCategory> = {
  AI:       "music",
  Plugins:  "gear",
  Sync:     "sync",
  Industry: "general",
};

function mapCategory(newsCategory: string): PostCategory {
  return CATEGORY_MAP[newsCategory] ?? "general";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; FennecBot/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function handler(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Fetch news ─────────────────────────────────────────
    const baseUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
    const newsRes = await fetch(`${baseUrl}/api/news`);
    if (!newsRes.ok) throw new Error(`News fetch failed: ${newsRes.status}`);
    const allItems: NewsItem[] = await newsRes.json();

    // ── 2. Filter already-posted (single batch query) ────────
    const { data: postedRows } = await supabase
      .from("bot_posted_urls")
      .select("url")
      .in("url", allItems.map((i) => i.url));
    const postedSet = new Set((postedRows ?? []).map((r) => r.url));
    const fresh = allItems.filter((item) => !postedSet.has(item.url));

    if (fresh.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No new news items" });
    }

    // ── 3. Pick one at random ─────────────────────────────────
    const item = pickRandom(fresh);
    const format = pickFormat();

    // ── 4. Rewrite with Claude + fetch og:image ───────────────
    const [rawContent, ogImage] = await Promise.all([
      rewriteWithClaude(item, format),
      fetchOgImage(item.url),
    ]);
    const content = `${rawContent}\n\nvía ${item.source}`;

    // ── 5. Insert post into Supabase ──────────────────────────
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id:    BOT_UUID,
        content,
        category:   mapCategory(item.category),
        media_url:  ogImage,
        media_type: ogImage ? "image" : null,
        media_name: null,
        link_url:   item.url,
        link_title: item.headline,
        repost_of:  null,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    // ── 6. Mark URL as posted (rollback post if marking fails) ─
    const { error: markError } = await supabase
      .from("bot_posted_urls")
      .insert({ url: item.url });
    if (markError && markError.code !== "23505") {
      // Rollback the post so the cron doesn't leave dangling untracked posts
      await supabase.from("posts").delete().eq("id", data.id);
      throw new Error(`Failed to mark URL as posted (post rolled back): ${markError.message}`);
    }

    return NextResponse.json({ ok: true, postId: data.id, format, headline: item.headline });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bot-post] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel crons always use GET; manual triggers can use POST
export const GET  = handler;
export const POST = handler;
