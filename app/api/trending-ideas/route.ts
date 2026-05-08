import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Keywords que rotamos para cubrir el nicho de producción musical
const KEYWORD_SETS = [
  "music production tips 2025",
  "beat making tutorial",
  "fl studio tutorial",
  "logic pro tips",
  "ableton live tutorial",
  "how to mix music",
  "music producer workflow",
  "sample flipping tutorial",
];

export type TrendingVideo = {
  id:          string;
  title:       string;
  channel:     string;
  thumbnail:   string;
  views:       string;
  url:         string;
  publishedAt: string;
  why:         string;   // Claude's analysis
  angle:       string;   // Content angle for the producer
  tag:         string;   // e.g. "Trending" | "Underrated" | "Viral format"
  tagColor:    string;
};

// Pick 2 random keyword sets per request to vary the feed
function pickKeywords(n = 2) {
  const shuffled = [...KEYWORD_SETS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
  if (n >= 1_000)     return `${Math.round(n / 1_000)}K views`;
  return `${n} views`;
}

const TAG_COLORS: { tag: string; color: string }[] = [
  { tag: "Trending",       color: "bg-red-400/20 text-red-400"     },
  { tag: "Viral format",   color: "bg-amber-400/20 text-amber-400" },
  { tag: "Underrated",     color: "bg-blue-400/20 text-blue-400"   },
  { tag: "Educational",    color: "bg-emerald-400/20 text-emerald-400" },
  { tag: "Storytelling",   color: "bg-purple-400/20 text-purple-400"  },
];

async function fetchYouTubeVideos(keyword: string, maxResults = 4) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", keyword);
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "viewCount");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("relevanceLanguage", "en");
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

  const res  = await fetch(url.toString());
  const data = await res.json();
  return data.items ?? [];
}

async function fetchVideoStats(videoIds: string[]) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics");
  url.searchParams.set("id", videoIds.join(","));
  url.searchParams.set("key", process.env.YOUTUBE_API_KEY!);

  const res  = await fetch(url.toString());
  const data = await res.json();
  const map: Record<string, number> = {};
  for (const item of data.items ?? []) {
    map[item.id] = parseInt(item.statistics?.viewCount ?? "0", 10);
  }
  return map;
}

async function analyzeWithClaude(videos: {
  title: string; channel: string; views: number;
}[]): Promise<{ why: string; angle: string; tag: string; tagColor: string }[]> {
  const client = new Anthropic({ apiKey: process.env.FENNEC_ANTHROPIC_KEY });

  const prompt = `You are an expert music production content strategist. Analyze these YouTube videos that are trending in the music production niche this week.

For each video, provide:
1. "why": 1-2 sentences explaining why it's performing well (what hook, format, or topic is resonating). Be specific and insightful, not generic.
2. "angle": 1 sentence suggesting how a music producer/composer could adapt this content idea for their own channel.
3. "tag": Pick ONE tag from this list that best describes the video's content strategy: "Trending", "Viral format", "Underrated", "Educational", "Storytelling"

Videos to analyze:
${videos.map((v, i) => `${i + 1}. "${v.title}" by ${v.channel} — ${formatViews(v.views)}`).join("\n")}

Respond ONLY with a valid JSON array with ${videos.length} objects, each with keys: "why", "angle", "tag". No markdown, no explanation.`;

  const message = await client.messages.create({
    model:      "claude-haiku-4-5",
    max_tokens: 1024,
    messages:   [{ role: "user", content: prompt }],
  });

  let text = (message.content[0] as { type: string; text: string }).text.trim();
  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const parsed = JSON.parse(text) as { why: string; angle: string; tag: string }[];

  return parsed.map((item) => ({
    ...item,
    tagColor: TAG_COLORS.find((t) => t.tag === item.tag)?.color ?? TAG_COLORS[0].color,
  }));
}

export async function GET() {
  console.log("[trending-ideas] FENNEC_ANTHROPIC_KEY present:", !!process.env.FENNEC_ANTHROPIC_KEY);
  console.log("[trending-ideas] YOUTUBE_API_KEY present:", !!process.env.YOUTUBE_API_KEY);
  try {
    const keywords = pickKeywords(2);

    // Fetch videos for each keyword set
    const rawResults = await Promise.all(keywords.map((kw) => fetchYouTubeVideos(kw, 4)));
    const allItems   = rawResults.flat();

    // Dedupe by video ID
    const seen = new Set<string>();
    const unique = allItems.filter((item: { id: { videoId: string } }) => {
      const id = item.id?.videoId;
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    }).slice(0, 7);

    if (!unique.length) {
      return NextResponse.json({ videos: [], cachedAt: Date.now() });
    }

    // Fetch view counts
    const videoIds = unique.map((v: { id: { videoId: string } }) => v.id.videoId);
    const stats    = await fetchVideoStats(videoIds);

    // Build video list for Claude
    const forAnalysis = unique.map((v: {
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; thumbnails: { high: { url: string } }; publishedAt: string };
    }) => ({
      id:      v.id.videoId,
      title:   v.snippet.title,
      channel: v.snippet.channelTitle,
      thumb:   v.snippet.thumbnails?.high?.url ?? "",
      published: v.snippet.publishedAt,
      views:   stats[v.id.videoId] ?? 0,
    }));

    // Analyze with Claude
    const analyses = await analyzeWithClaude(
      forAnalysis.map((v) => ({ title: v.title, channel: v.channel, views: v.views }))
    );

    // Merge
    const videos: TrendingVideo[] = forAnalysis.map((v, i) => ({
      id:          v.id,
      title:       v.title,
      channel:     v.channel,
      thumbnail:   v.thumb,
      views:       formatViews(v.views),
      url:         `https://www.youtube.com/watch?v=${v.id}`,
      publishedAt: v.published,
      why:         analyses[i]?.why   ?? "",
      angle:       analyses[i]?.angle ?? "",
      tag:         analyses[i]?.tag   ?? "Trending",
      tagColor:    analyses[i]?.tagColor ?? TAG_COLORS[0].color,
    }));

    return NextResponse.json({ videos, cachedAt: Date.now() });
  } catch (err) {
    console.error("[trending-ideas]", err);
    return NextResponse.json({ error: "Failed to fetch trending ideas" }, { status: 500 });
  }
}
