import { supabase } from "./supabase";

/**
 * Generic per-user cloud state (table: user_state). Backs the useCloudArray
 * hook so localStorage-only modules (content scripts/ideas/tasks, pricing
 * settings) sync across a user's devices. Each `key` maps to one JSON blob.
 * Owner-only via RLS; realtime-enabled for live cross-device updates.
 */

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function pullUserState<T = unknown>(key: string): Promise<T | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase
    .from("user_state")
    .select("value")
    .eq("user_id", uid)
    .eq("key", key)
    .maybeSingle();
  if (error || !data) return null;
  return data.value as T;
}

export async function pushUserState(key: string, value: unknown): Promise<void> {
  const uid = await currentUserId();
  if (!uid) return;
  const { error } = await supabase
    .from("user_state")
    .upsert(
      { user_id: uid, key, value, updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" },
    );
  if (error) console.error("[userState] push failed", key, error.message);
}

/**
 * Subscribe to realtime changes for one key. Returns an unsubscribe fn.
 * Fires cb(value) whenever this user's row for `key` is inserted/updated.
 */
export function subscribeUserState(key: string, cb: (value: unknown) => void): () => void {
  let channel: ReturnType<typeof supabase.channel> | null = null;
  let cancelled = false;
  void (async () => {
    const uid = await currentUserId();
    if (!uid || cancelled) return;
    channel = supabase
      .channel(`user_state:${key}:${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_state", filter: `user_id=eq.${uid}` },
        (payload) => {
          const row = (payload.new ?? {}) as { key?: string; value?: unknown };
          if (row.key === key) cb(row.value);
        },
      )
      .subscribe();
  })();
  return () => {
    cancelled = true;
    if (channel) void supabase.removeChannel(channel);
  };
}
