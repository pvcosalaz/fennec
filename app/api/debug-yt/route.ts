import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.YOUTUBE_API_KEY ?? "";
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", "music production tips 2025");
  url.searchParams.set("type", "video");
  url.searchParams.set("order", "viewCount");
  url.searchParams.set("maxResults", "2");
  url.searchParams.set("key", key);

  const res  = await fetch(url.toString());
  const text = await res.text();

  return NextResponse.json({
    keyLen:    key.length,
    keyPrefix: key.slice(0, 10),
    keySuffix: key.slice(-4),
    httpStatus: res.status,
    youtubeResponse: JSON.parse(text),
  });
}
