export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const VALID_FORMATS = new Set(["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);

export async function POST(req: Request) {
  try {
    const body = await req.json() as { format?: unknown; line?: unknown };

    const format = typeof body.format === "string" ? body.format.trim() : "";
    const line   = typeof body.line   === "string" ? body.line.trim()   : "";

    if (!format || !VALID_FORMATS.has(format)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }
    if (!line || line.length > 300) {
      return NextResponse.json({ error: "Invalid line" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.FENNEC_ANTHROPIC_KEY });

    const prompt = `You are an expert music content strategist helping a music producer/composer create content for their personal brand on social media.

The user selected this combination:
- Format: "${format}"
- Content Line: "${line}"

Your job is to explain this specific combination in two parts:

1. "angle" — A clear, inspiring explanation of what this combination means in practice. What kind of content does this produce? Give 3–4 concrete examples of what "X" could be replaced with (e.g. real composers, artists, genres, techniques, software, sounds). Make it feel specific and actionable. Write in second person ("you"). Max 4 sentences.

2. "why" — A practical guide on HOW to execute this specific combination. What do they need to record? What's the structure? What makes this format work with this content line? Be direct and specific. Max 3 sentences.

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
