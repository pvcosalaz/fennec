// lib/botContent.ts
import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/app/api/news/route";

export type BotFormat = 1 | 2 | 3;

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY environment variable is not set");
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FORMAT_INSTRUCTIONS: Record<BotFormat, string> = {
  1: `Escribe un resumen de 2-3 oraciones de la noticia. Tono: colega que te cuenta algo interesante, directo y sin ser formal. Sin preguntas al final. Termina con el link de la noticia en una línea separada.`,
  2: `Escribe un resumen de 2 oraciones de la noticia y cierra con una pregunta genuina a la comunidad (ej: "¿Ya lo están usando?", "¿Qué opinan?"). Termina con el link en una línea separada.`,
  3: `Escribe un hot take u opinión corta inspirada en la noticia — no la resumas literalmente. Sé conversacional, como si lo dijera en un grupo de WhatsApp entre productores. Puede o no terminar en pregunta. Termina con el link en una línea separada.`,
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
  const prompt = `Eres el asistente oficial de Fennec, una app para productores musicales latinoamericanos.
Tu tono es el de un colega creativo — directo, informado, sin ser formal. Escribe en español.
El cuerpo del mensaje debe tener máximo 250 caracteres (sin contar el link).

Noticia: ${item.headline}
Fuente: ${item.source}
Resumen: ${item.summary}

Formato: ${FORMAT_INSTRUCTIONS[format]}`;

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
