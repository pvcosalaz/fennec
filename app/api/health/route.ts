import { NextResponse } from "next/server";

type Check = { name: string; ok: boolean; detail: string };

async function checkYouTube(): Promise<Check> {
  const key = process.env.YOUTUBE_API_KEY ?? "";
  if (key.length < 30) {
    return { name: "YouTube API", ok: false, detail: `Key too short (${key.length} chars — likely truncated in Vercel)` };
  }
  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("q", "music production");
    url.searchParams.set("maxResults", "1");
    url.searchParams.set("key", key);
    const res  = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
    const data = await res.json() as { items?: unknown[]; error?: { message: string } };
    if (data.error) return { name: "YouTube API", ok: false, detail: data.error.message };
    return { name: "YouTube API", ok: true, detail: "OK" };
  } catch (e) {
    return { name: "YouTube API", ok: false, detail: String(e) };
  }
}

async function checkAnthropic(): Promise<Check> {
  const key = process.env.FENNEC_ANTHROPIC_KEY ?? "";
  if (key.length < 80) {
    return { name: "Anthropic Key", ok: false, detail: `Key too short (${key.length} chars — likely truncated in Vercel)` };
  }
  return { name: "Anthropic Key", ok: true, detail: "OK" };
}

async function checkSupabase(): Promise<Check> {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url || !anon) {
    return { name: "Supabase", ok: false, detail: "URL or ANON_KEY missing" };
  }
  if (anon.length < 100) {
    return { name: "Supabase", ok: false, detail: `ANON_KEY too short (${anon.length} chars — likely truncated in Vercel)` };
  }
  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { name: "Supabase", ok: false, detail: `HTTP ${res.status}` };
    return { name: "Supabase", ok: true, detail: "OK — connected" };
  } catch (e) {
    return { name: "Supabase", ok: false, detail: String(e) };
  }
}

async function checkCronSecret(): Promise<Check> {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return { name: "Cron Secret", ok: false, detail: "CRON_SECRET is empty — bot posts won't fire" };
  return { name: "Cron Secret", ok: true, detail: "OK" };
}

export async function GET() {
  const [youtube, anthropic, supabase, cron] = await Promise.all([
    checkYouTube(),
    checkAnthropic(),
    checkSupabase(),
    checkCronSecret(),
  ]);

  const checks  = [youtube, anthropic, supabase, cron];
  const allOk   = checks.every((c) => c.ok);
  const emoji   = (ok: boolean) => ok ? "✅" : "❌";

  const text = [
    `Fennec Health Check — ${new Date().toISOString()}`,
    `Status: ${allOk ? "ALL SYSTEMS GO 🚀" : "ISSUES DETECTED ⚠️"}`,
    "",
    ...checks.map((c) => `${emoji(c.ok)} ${c.name.padEnd(16)} ${c.detail}`),
    "",
    allOk
      ? "Everything is working correctly."
      : "Fix the ❌ items above in Vercel → Settings → Environment Variables.",
  ].join("\n");

  return new Response(text, {
    status: allOk ? 200 : 500,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
