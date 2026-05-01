// lib/botContent.ts
import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/app/api/news/route";

export type BotFormat = 1 | 2 | 3;

// Uses the same key as other API routes in this project
const ANTHROPIC_API_KEY = process.env.FENNEC_ANTHROPIC_KEY ?? process.env.ANTHROPIC_API_KEY;

const FORMAT_INSTRUCTIONS: Record<BotFormat, string> = {
  1: `Write a 2-3 sentence summary of the news. Tone: a creative colleague telling you something interesting — direct, casual, not formal. No question at the end.`,
  2: `Write a 2-sentence summary of the news and close with a genuine question to the community (e.g. "Are you already using it?", "What do you think?").`,
  3: `Write a hot take or short opinion inspired by the news — don't summarize it literally. Be conversational, like texting in a group chat with producers. May or may not end in a question.`,
};

/**
 * Picks a random format (1, 2, or 3) for variety.
 */
export function pickFormat(): BotFormat {
  return ([1, 2, 3] as BotFormat[])[Math.floor(Math.random() * 3)];
}

/**
 * Calls Claude Haiku to rewrite a news item in the given format.
 * Returns the rewritten text (max ~300 chars of body + link).
 */
export async function rewriteWithClaude(item: NewsItem, format: BotFormat): Promise<string> {
  const prompt = `You are the official assistant of Fennec, an app for music producers.
Your tone is that of a creative colleague — direct, informed, not formal. Write in English.
Maximum 250 characters total.
IMPORTANT: No markdown. No asterisks, no bold, no italics, no formatting symbols.
Do not include URLs or links in the text. Do not mention the source at the end.

Noticia: ${item.headline}
Fuente: ${item.source}
Resumen: ${item.summary}

Formato: ${FORMAT_INSTRUCTIONS[format]}`;

  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  if (!message.content || message.content.length === 0) {
    throw new Error("Claude returned empty content");
  }
  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response type");
  return block.text.trim();
}
