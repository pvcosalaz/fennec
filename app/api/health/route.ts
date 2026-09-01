import { NextRequest } from "next/server";

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
    console.error("[health] YouTube:", e);
    return { name: "YouTube API", ok: false, detail: "unavailable" };
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
    console.error("[health] Supabase:", e);
    return { name: "Supabase", ok: false, detail: "unavailable" };
  }
}

async function checkCronSecret(): Promise<Check> {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return { name: "Cron Secret", ok: false, detail: "CRON_SECRET is empty — bot posts won't fire" };
  return { name: "Cron Secret", ok: true, detail: "OK" };
}

/* [SEGURIDAD 2026-08-31] Esta ruta es PUBLICA y devolvia String(e) al
   navegador, o sea el mensaje crudo de la excepcion. El detalle se registra
   del lado servidor; afuera solo sale el veredicto. */
export async function GET(req: NextRequest) {
  /* [SEGURIDAD 2026-08-31] Ya no se acepta ?secret= por la URL. Ese secreto
     es el mismo CRON_SECRET que protege push/send, bot-post, cache-refresh y
     el purgado de notas de voz, y en la barra de direcciones acaba grabado en
     el historial del navegador, en los logs de acceso de Vercel y en la
     cabecera Referer de cualquier salto. Solo por cabecera:
       curl -H "x-health-secret: $CRON_SECRET" https://app.fennec.audio/api/health */
  const secret = process.env.CRON_SECRET;
  const provided = req.headers.get("x-health-secret");
  if (!secret || provided !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }
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
