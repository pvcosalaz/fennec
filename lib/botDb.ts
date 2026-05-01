// lib/botDb.ts
import { supabase } from "./supabase";

/**
 * Returns true if this news URL has already been posted by the bot.
 */
export async function hasBeenPosted(url: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("bot_posted_urls")
    .select("id", { count: "exact", head: true })
    .eq("url", url);
  if (error) {
    console.error("[botDb] hasBeenPosted error:", error.message);
    return false; // fail open — better to repost than to skip forever
  }
  return (count ?? 0) > 0;
}

/**
 * Marks a URL as posted so it won't be picked again.
 */
export async function markAsPosted(url: string): Promise<void> {
  const { error } = await supabase
    .from("bot_posted_urls")
    .insert({ url });
  if (error && error.code !== "23505") {
    // 23505 = unique_violation — already exists, that's fine
    console.error("[botDb] markAsPosted error:", error.message);
  }
}
