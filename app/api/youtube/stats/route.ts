import { NextResponse } from "next/server";

const CACHE_KEY = "fennec-youtube-cache-v1";
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

type YouTubeStats = {
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
  channelTitle: string;
  thumbnail: string;
};

// Simple in-memory cache for the serverless function
let memCache: { data: YouTubeStats; cachedAt: number } | null = null;

export async function GET() {
  const apiKey = process.env.YOUTUBE_API_KEY;
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE ?? "pacosalaz";

  if (!apiKey) {
    return NextResponse.json({ error: "Missing YOUTUBE_API_KEY" }, { status: 500 });
  }

  // Serve from cache if fresh
  if (memCache && Date.now() - memCache.cachedAt < CACHE_TTL) {
    return NextResponse.json(memCache.data);
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&forHandle=${handle}&key=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 21600 } });
    if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);

    const data = await res.json();
    const channel = data.items?.[0];
    if (!channel) throw new Error("Channel not found");

    const stats: YouTubeStats = {
      subscriberCount: parseInt(channel.statistics?.subscriberCount ?? "0", 10),
      viewCount:       parseInt(channel.statistics?.viewCount ?? "0", 10),
      videoCount:      parseInt(channel.statistics?.videoCount ?? "0", 10),
      channelTitle:    channel.snippet?.title ?? "",
      thumbnail:       channel.snippet?.thumbnails?.default?.url ?? "",
    };

    memCache = { data: stats, cachedAt: Date.now() };
    return NextResponse.json(stats);
  } catch (err) {
    console.error("YouTube stats error:", err);
    return NextResponse.json({ error: "Failed to fetch YouTube stats" }, { status: 500 });
  }
}
