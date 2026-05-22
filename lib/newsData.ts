// Shared news-fetching logic used by /api/news and /api/bot-post

type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  content: string;
  thumbnail: string;
  enclosure?: { link: string; type: string };
};

type RssResponse = {
  status: string;
  items: RssItem[];
};

export type NewsItem = {
  id: string;
  source: string;
  category: string;
  categoryStyle: string;
  headline: string;
  summary: string;
  content: string;
  time: string;
  url: string;
  pubDate: string;
  image?: string;
};

const FEEDS = [
  { url: "https://www.musicbusinessworldwide.com/feed/", source: "Music Business Worldwide" },
  { url: "https://www.hypebot.com/hypebot/atom.xml",    source: "Hypebot" },
  { url: "https://musictech.com/feed/",                 source: "MusicTech" },
  { url: "https://www.soundonsound.com/feed",           source: "Sound On Sound" },
  { url: "https://www.kvraudio.com/news.rss",           source: "KVR Audio" },
  { url: "https://bedroomproducersblog.com/feed/",      source: "BPB" },
  { url: "https://www.musicradar.com/feeds/all",        source: "MusicRadar" },
];

function stripHtml(html: string, maxLen = 220): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim()
    .slice(0, maxLen);
}

function extractImage(item: RssItem): string | undefined {
  if (item.thumbnail && item.thumbnail.startsWith("http")) return item.thumbnail;
  if (item.enclosure?.link?.startsWith("http") && item.enclosure.type?.startsWith("image"))
    return item.enclosure.link;
  const src = (item.content || item.description || "").match(/<img[^>]+src=["']([^"']+)["']/i);
  if (src?.[1]?.startsWith("http")) return src[1];
  return undefined;
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function detectCategory(title: string, description: string, source?: string): { category: string; categoryStyle: string } {
  const text = (title + " " + description).toLowerCase();
  // KVR and BPB are always gear/plugin sources
  if (source === "KVR Audio" || source === "BPB")
    return { category: "New Gear", categoryStyle: "bg-violet-400/10 text-violet-400" };
  if (/\bai\b|artificial intelligence|machine learning|generative/.test(text))
    return { category: "AI", categoryStyle: "bg-amber-400/10 text-amber-400" };
  if (/new release|launches|introduces|unveils|announces.*plugin|announces.*instrument|new plugin|new vst|new synth|new drum|new sample|new library|plugin review|instrument review|gear review/.test(text))
    return { category: "New Gear", categoryStyle: "bg-violet-400/10 text-violet-400" };
  if (/plugin|vst|daw|ableton|logic|fl studio|synth|gear|hardware|controller|sample pack/.test(text))
    return { category: "Plugins & Gear", categoryStyle: "bg-purple-400/10 text-purple-400" };
  if (/sync|licens|film|tv series|television|commercial|placement|supervisor/.test(text))
    return { category: "Sync", categoryStyle: "bg-emerald-400/10 text-emerald-400" };
  return { category: "Industry", categoryStyle: "bg-blue-400/10 text-blue-400" };
}

export async function fetchNewsItems(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const encoded = encodeURIComponent(feed.url);
      const res = await fetch(
        `https://api.rss2json.com/v1/api.json?rss_url=${encoded}`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) return [];
      const data = (await res.json()) as RssResponse;
      if (data.status !== "ok" || !Array.isArray(data.items)) return [];

      return data.items.map((item, i): NewsItem => {
        const { category, categoryStyle } = detectCategory(item.title, item.description, feed.source);
        const rawContent = (item.content?.length ?? 0) > (item.description?.length ?? 0)
          ? item.content
          : item.description;
        return {
          id: `${feed.source}-${i}-${Date.now()}`,
          source: feed.source,
          category,
          categoryStyle,
          headline: item.title,
          summary: stripHtml(item.description, 200),
          content: stripHtml(rawContent, 1200),
          time: timeAgo(item.pubDate),
          url: item.link,
          pubDate: item.pubDate,
          image: extractImage(item),
        };
      });
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
    .slice(0, 18);
}
