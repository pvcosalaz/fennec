export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/* Los formatos son texto libre: el usuario los crea en el Lab y viven en su
   localStorage, así que no hay lista cerrada contra la cual validar.
   Antes había un allowlist de "1".."10" —restos de cuando los formatos eran
   un catálogo numerado fijo— y el cliente manda el NOMBRE. Resultado: cada
   generación moría en 400 "Invalid format" y el Lab nunca produjo una idea
   (Paco 2026-08-02). Lo que sí se valida es la forma: string, no vacío,
   acotado, porque esto entra a un prompt. */
const MAX_FORMAT = 120;
const MAX_LINE = 300;
const MAX_DESCRIPTION = 400;

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/* Fusible de gasto, no restricción de producto. El usuario intenso hace ~10
   ideas al día, así que 30 no lo toca nunca; lo que tapa es que alguien saque
   su token de sesión y use este endpoint como API barata de Claude, que es el
   único escenario sin techo natural (Paco 2026-08-02).
   Se puede subir sin tocar código con FENNEC_LAB_DAILY_LIMIT. */
const QUOTA_FEATURE = "lab-idea";
const DAILY_LIMIT = (() => {
  const raw = Number(process.env.FENNEC_LAB_DAILY_LIMIT);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 30;
})();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as {
      format?: unknown; line?: unknown; formatDescription?: unknown;
    };

    const format = cleanText(body.format, MAX_FORMAT);
    const line = cleanText(body.line, MAX_LINE);
    // Los formatos de fábrica traen su propia definición (contentData.ts).
    // Mandarla evita que el modelo adivine qué significa, p. ej., "B-roll +
    // info in description". Los formatos que el usuario crea no la tienen.
    const formatDescription = cleanText(body.formatDescription, MAX_DESCRIPTION);

    if (!format) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
    if (!line) {
      return NextResponse.json({ error: "Invalid line" }, { status: 400 });
    }

    // Pull the producer's profile so the angle can be tailored to their craft.
    // is_pro gate: the Content Lab is a Pro feature and this reaches a Claude
    // call — without the gate any free account could spend FENNEC_ANTHROPIC_KEY.
    const { data: profile } = await getSupabaseAdmin()
      .from("profiles")
      .select("role, country, genres, is_pro")
      .eq("id", user.id)
      .single();

    if (!profile?.is_pro) {
      return NextResponse.json({ error: "Content Lab is a Pro feature." }, { status: 403 });
    }

    /* Se reserva ANTES de llamar a Claude, no después: el objetivo es que el
       gasto nunca ocurra, y contar al final deja pasar todo lo que ya se pagó.
       El contador vive en el servidor (service_role) porque un contador que el
       navegador pudiera escribir se reinicia solo. */
    const { data: used, error: quotaError } = await getSupabaseAdmin()
      .rpc("consume_ai_quota", {
        p_user: user.id,
        p_feature: QUOTA_FEATURE,
        p_limit: DAILY_LIMIT,
      });

    if (quotaError) {
      // El fusible no debe tumbar la función si la BD falla: se registra y se
      // deja pasar. Un fusible roto que bloquea a todos es peor que uno abierto.
      console.error("[lab-idea] quota check failed, allowing through:", quotaError);
    } else if (used === null) {
      return NextResponse.json({
        error: "That's a lot of ideas for one day. Take a break and come back tomorrow.",
        quota: true,
        limit: DAILY_LIMIT,
      }, { status: 429 });
    }

    /* Si Claude truena, el usuario no gastó nada nuestro y no es justo que
       pierda un turno por un error que no es suyo. */
    const refund = async () => {
      if (quotaError) return;
      await getSupabaseAdmin()
        .rpc("refund_ai_quota", { p_user: user.id, p_feature: QUOTA_FEATURE })
        .then(({ error }) => {
          if (error) console.error("[lab-idea] refund failed:", error);
        });
    };

    const genres = Array.isArray(profile?.genres) ? profile!.genres.filter(Boolean) : [];
    const role = typeof profile?.role === "string" ? profile.role.trim() : "";
    const country = typeof profile?.country === "string" ? profile.country.trim() : "";

    const producerContext = [
      role    ? `- Role: ${role}` : "",
      genres.length ? `- Primary genres: ${genres.join(", ")}` : "",
      country ? `- Based in: ${country}` : "",
    ].filter(Boolean).join("\n");

    const hasContext = producerContext.length > 0;

    const client = new Anthropic({ apiKey: process.env.FENNEC_ANTHROPIC_KEY });

    const prompt = `You are an expert music content strategist helping a music producer/composer create content for their personal brand on social media.
${hasContext ? `
This is who the producer is:
${producerContext}
` : ""}
The user selected this combination:
- Format: "${format}"${formatDescription ? `\n  (what this format means: ${formatDescription})` : ""}
- Content Line: "${line}"

Your job is to explain this specific combination in two parts:

1. "angle" — A clear, inspiring explanation of what this combination means in practice. What kind of content does this produce? Give 3–4 concrete examples of what "X" could be replaced with (e.g. real composers, artists, genres, techniques, software, sounds).${hasContext ? " Ground every example in the producer's actual genres and craft above — reference artists, techniques, and references that a producer in those genres would genuinely use, never generic pop examples that don't fit them." : ""} Make it feel specific and actionable. Write in second person ("you"). Max 4 sentences.

2. "why" — A practical guide on HOW to execute this specific combination. What do they need to record? What's the structure? What makes this format work with this content line?${hasContext ? " Tailor the execution advice to their genre and workflow." : ""} Be direct and specific. Max 3 sentences.

Respond ONLY with a valid JSON object with two keys: "angle" and "why". No markdown, no explanation outside the JSON.`;

    /* A partir de aquí el turno ya está reservado, así que TODA salida que no
       sea un éxito tiene que devolverlo. */
    let parsed: { angle: string; why: string };
    try {
      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 512,
        messages: [{ role: "user", content: prompt }],
      });

      let text = (message.content[0] as { type: string; text: string }).text.trim();
      text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      parsed = JSON.parse(text) as { angle: string; why: string };
      if (typeof parsed.angle !== "string" || typeof parsed.why !== "string") {
        console.error("[lab-idea] respuesta sin angle/why:", text.slice(0, 200));
        throw new Error("Missing angle or why");
      }
    } catch (err) {
      console.error("[lab-idea] generation failed:", err);
      await refund();
      return NextResponse.json({ error: "Failed to generate idea" }, { status: 500 });
    }

    return NextResponse.json({ angle: parsed.angle, why: parsed.why });
  } catch (err) {
    console.error("[lab-idea]", err);
    return NextResponse.json({ error: "Failed to generate idea" }, { status: 500 });
  }
}
