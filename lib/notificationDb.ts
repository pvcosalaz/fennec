import { supabase } from "./supabase";

export type NotificationType =
  | "audio_feedback"
  | "content_scheduled"
  | "project_deadline"
  | "industry_news";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  audio_feedback: boolean;
  content_scheduled: boolean;
  project_deadline: boolean;
  industry_news: boolean;
};

export type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// ── Notifications ─────────────────────────────────────────────────

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function markOneRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

/** Creates a notification. Checks preferences first — silently skips if type is disabled. */
/* ⚠️ `db` NO es opcional por gusto.
   Esta funcion se llama desde una ruta de API, o sea desde el SERVIDOR, y hasta
   hoy usaba el cliente anonimo del navegador. Ahi no hay sesion, y el insert
   mete un renglon con el user_id de OTRA persona (el dueño del track), que es
   justo lo que RLS existe para impedir. Resultado: el insert lanzaba, la ruta
   respondia 500 y NUNCA llegaba ninguna notificacion de feedback. No tenia nada
   que ver con las preferencias del usuario, que era la sospecha obvia
   (Paco lo reporto dos veces, 2026-08-03).
   Desde el servidor hay que pasarle el cliente admin. */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** Cliente con service role. Obligatorio desde el servidor. */
  db?: typeof supabase;
}): Promise<Notification | null> {
  const cli = params.db ?? supabase;
  // Check preference
  const { data: prefs } = await cli
    .from("notification_preferences")
    .select(params.type)
    .eq("user_id", params.userId)
    .single();

  // If row doesn't exist yet (first time), treat as enabled
  if (prefs && (prefs as Record<string, boolean>)[params.type] === false) return null;

  const { data, error } = await cli
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Preferences ───────────────────────────────────────────────────

export async function fetchPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Row doesn't exist — return defaults
    return {
      user_id: userId,
      audio_feedback: true,
      content_scheduled: true,
      project_deadline: true,
      industry_news: true,
    };
  }
  if (error) throw error;
  return data;
}

export async function upsertPreferences(prefs: NotificationPreferences): Promise<void> {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(prefs);
  if (error) throw error;
}

// ── Push subscriptions ────────────────────────────────────────────

export async function savePushSubscription(row: PushSubscriptionRow): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}

export async function fetchPushSubscriptionsForUser(userId: string, db?: typeof supabase): Promise<PushSubscriptionRow[]> {
  const { data, error } = await (db ?? supabase)
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*");
  if (error) throw error;
  return data ?? [];
}
