export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_FORMATS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: { user }, error: authError } = await getSupabaseAdmin().auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json() as { format?: unknown; line?: unknown };

    const format = typeof body.format === "string" ? body.format.trim() : "";
    const line   = typeof body.line   === "string" ? body.line.trim()   : "";

    if (!format || !VALID_FORMATS.has(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
    if (!line || line.length > 300) {
      return NextResponse.json({ error: "Invalid line" }, { status: 400 });
    }

    // Pull the producer's profile so the angle can be tailored to their craft
    const { data: profile } = await getSupabaseAdmin()
      .from("profiles")
      .select("role, country, genres")
      .eq("id", user.id)
      .single();

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
- Format: "${format}"
- Content Line: "${line}"

Your job is to explain this specific combination in two parts:

1. "angle" — A clear, inspiring explanation of what this combination means in practice. What kind of content does this produce? Give 3–4 concrete examples of what "X" could be replaced with (e.g. real composers, artists, genres, techniques, software, sounds).${hasContext ? " Ground every example in the producer's actual genres and craft above — reference artists, techniques, and references that a producer in those genres would genuinely use, never generic pop examples that don't fit them." : ""} Make it feel specific and actionable. Write in second person ("you"). Max 4 sentences.

2. "why" — A practical guide on HOW to execute this specific combination. What do they need to record? What's the structure? What makes this format work with this content line?${hasContext ? " Tailor the execution advice to their genre and workflow." : ""} Be direct and specific. Max 3 sentences.

Respond ONLY with a valid JSON object with two keys: "angle" and "why". No markdown, no explanation outside the JSON.`;

    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    let text = (message.content[0] as { type: string; text: string }).text.trim();
    text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: { angle: string; why: string };
    try {
      parsed = JSON.parse(text) as { angle: string; why: string };
      if (typeof parsed.angle !== "string" || typeof parsed.why !== "string") {
        throw new Error("Missing angle or why");
      }
    } catch {
      console.error("[lab-idea] JSON parse failed:", text.slice(0, 200));
      return NextResponse.json({ error: "Failed to generate idea" }, { status: 500 });
    }

    return NextResponse.json({ angle: parsed.angle, why: parsed.why });
  } catch (err) {
    console.error("[lab-idea]", err);
    return NextResponse.json({ error: "Failed to generate idea" }, { status: 500 });
  }
}
