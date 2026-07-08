// lib/suggestionsDb.ts — community feature suggestions (submitted from Settings).
import { supabase } from "@/lib/supabase";

export type SuggestionStatus = "new" | "planned" | "in_progress" | "done" | "declined";

export type Suggestion = {
  id: string;
  user_id: string;
  body: string;
  status: SuggestionStatus;
  vote_count: number;
  created_at: string;
};

/** Submit a new feature suggestion. Returns the row, or null on failure. */
export async function submitSuggestion(userId: string, body: string): Promise<Suggestion | null> {
  const trimmed = body.trim();
  if (trimmed.length < 3) return null;
  const { data, error } = await supabase
    .from("suggestions")
    .insert({ user_id: userId, body: trimmed.slice(0, 1000) })
    .select("*")
    .single();
  if (error) {
    console.error("[submitSuggestion]", error.message);
    return null;
  }
  return data as Suggestion;
}

/** The current user's own suggestions, newest first. Empty if the table
 *  doesn't exist yet (migration not run) — tolerant of pre-migration state. */
export async function fetchMySuggestions(userId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase
    .from("suggestions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[fetchMySuggestions]", error.message);
    return [];
  }
  return (data ?? []) as Suggestion[];
}
