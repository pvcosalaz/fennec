import Anthropic from "@anthropic-ai/sdk";
import type { NotificationType } from "./notificationDb";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type CopyContext = {
  type: NotificationType;
  commenterUsername?: string;
  trackTitle?: string;
  firstTimestamp?: string;
  contentTitle?: string;
  projectName?: string;
  newsHeadline?: string;
};

const FALLBACKS: Record<NotificationType, (ctx: CopyContext) => string> = {
  audio_feedback: (ctx) =>
    ctx.commenterUsername && ctx.trackTitle
      ? `@${ctx.commenterUsername} left feedback on "${ctx.trackTitle}"`
      : "Someone left feedback on your track",
  content_scheduled: (ctx) =>
    ctx.contentTitle
      ? `Time to post "${ctx.contentTitle}" — your audience is waiting`
      : "You have content scheduled to post today",
  project_deadline: (ctx) =>
    ctx.projectName
      ? `"${ctx.projectName}" is due tomorrow — final push!`
      : "A project deadline is tomorrow",
  industry_news: (ctx) =>
    ctx.newsHeadline ?? "New industry news just dropped",
};

export async function generateNotificationCopy(ctx: CopyContext): Promise<string> {
  try {
    const prompt = buildPrompt(ctx);
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (message.content[0] as { type: string; text: string }).text?.trim() ?? "";
    return text.length > 0 ? text.slice(0, 80) : FALLBACKS[ctx.type](ctx);
  } catch {
    return FALLBACKS[ctx.type](ctx);
  }
}

function buildPrompt(ctx: CopyContext): string {
  const base =
    "Write a single short push notification message (max 80 characters, no quotes). " +
    "Be natural, warm, and relevant. Include an emoji at the end. ";

  switch (ctx.type) {
    case "audio_feedback":
      return (
        base +
        `Context: @${ctx.commenterUsername} left a comment on the track "${ctx.trackTitle}".` +
        (ctx.firstTimestamp ? ` They referenced timestamp ${ctx.firstTimestamp}.` : "")
      );
    case "content_scheduled":
      return base + `Context: The user has content titled "${ctx.contentTitle}" scheduled to post today.`;
    case "project_deadline":
      return base + `Context: The project "${ctx.projectName}" is due tomorrow.`;
    case "industry_news":
      return base + `Context: New industry news: "${ctx.newsHeadline}". Write a short teaser.`;
  }
}
