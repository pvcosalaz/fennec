export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { fetchNewsItems } from "@/lib/newsData";
export type { NewsItem } from "@/lib/newsData";

export async function GET() {
  try {
    const items = await fetchNewsItems();
    return NextResponse.json(items, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
