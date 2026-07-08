// lib/networkDb.ts
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/communityTypes";
import { randomColorId } from "@/lib/fennecIdPalette";
import { uploadAudio } from "@/lib/communityDb";


export async function ensureColorAssigned(userId: string, currentColorId: string | null): Promise<string> {
  if (currentColorId) return currentColorId;

  const newColorId = randomColorId();

  const { error } = await supabase
    .from("profiles")
    .update({ color_id: newColorId })
    .eq("id", userId);

  if (error) {
    console.error("ensureColorAssigned:", error);
  }

  return newColorId;
}

export async function getNetworkContacts(userId: string): Promise<Profile[]> {
  // Step 1: fetch contact IDs owned by this user
  const { data: connections, error: connError } = await supabase
    .from("network_connections")
    .select("contact_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (connError) {
    console.error("getNetworkContacts (connections):", connError.message, connError.code);
    return [];
  }

  if (!connections || connections.length === 0) return [];

  const contactIds = connections.map((c) => c.contact_id as string);

  // Step 2: fetch the profiles for those IDs
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", contactIds);

  if (profilesError) {
    console.error("getNetworkContacts (profiles):", profilesError.message, profilesError.code);
    return [];
  }

  return (profiles ?? []) as Profile[];
}

// ── The handshake — dynamic QR, mutual exchange ─────────────────────────

/** Mint a ~60s QR token representing "connect with me". Null on failure
 *  (e.g. migration 20260706_connection_handshake.sql not run yet). */
export async function mintConnectionToken(): Promise<string | null> {
  const { data, error } = await supabase.rpc("mint_connection_token");
  if (error) {
    console.error("[mintConnectionToken]", error.message);
    return null;
  }
  return data as string;
}

export type RedeemResult =
  | { ok: true; peer: Profile }
  | { ok: false; reason: string };

/** Redeem a scanned token → mutual connection. Returns the peer profile
 *  (for the flip-reveal animation) or a reason string for a friendly error. */
export async function redeemConnectionToken(token: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_connection_token", { p_token: token });
  if (error) return { ok: false, reason: error.message };
  const d = data as { ok?: boolean; peer?: Profile } | null;
  return d?.ok && d.peer ? { ok: true, peer: d.peer } : { ok: false, reason: "unknown" };
}

// ── Public profile (the v2 physical-card hook) ──────────────────────────

/** Read-only public profile by username — deliberately excludes
 *  stripe_customer_id and is_admin (never needed by the client, and
 *  excluded from the anon SELECT grant per 20260703_security_rls.sql). */
export async function fetchPublicProfile(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, banner_url, role, country, genres, color_id, fennec_number, fennec_db_score, instagram, spotify, youtube_url, tiktok")
    .eq("username", username)
    .maybeSingle();
  if (error) {
    console.error("[fetchPublicProfile]", error.message);
    return null;
  }
  return (data as Profile) ?? null;
}

/** Send a connect request from the public profile page. Requires a
 *  signed-in caller (checked client-side for UX; RLS enforces server-side). */
export async function requestConnection(targetId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from("connection_requests")
    .insert({ requester_id: user.id, target_id: targetId });
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    console.error("[requestConnection]", error.message);
    return false;
  }
  return true;
}

// ── The radio — voice notes between connected producers ─────────────────

export type VoiceNote = {
  id: string;
  sender_id: string;
  recipient_id: string;
  audio_url: string;
  duration_seconds: number | null;
  created_at: string;
  expires_at: string;
  archived: boolean;
  played_at: string | null;
};

/** All notes in the frequency with one peer, oldest first. Empty if the
 *  table doesn't exist yet (migration not run) or on error. */
export async function fetchFrequency(userId: string, peerId: string): Promise<VoiceNote[]> {
  const { data, error } = await supabase
    .from("voice_notes")
    .select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[fetchFrequency]", error.message);
    return [];
  }
  return (data ?? []) as VoiceNote[];
}

/** Record → upload (reuses Melody Bank's uploadAudio) → insert. Null on failure. */
export async function sendVoiceNote(
  senderId: string,
  recipientId: string,
  blob: Blob,
  durationSeconds: number
): Promise<VoiceNote | null> {
  let audio_url: string;
  try {
    audio_url = await uploadAudio(blob, `vn-${senderId}-${Date.now()}.webm`);
  } catch (err) {
    console.error("[sendVoiceNote] upload", err);
    return null;
  }
  const { data, error } = await supabase
    .from("voice_notes")
    .insert({ sender_id: senderId, recipient_id: recipientId, audio_url, duration_seconds: durationSeconds })
    .select("*")
    .single();
  if (error) {
    console.error("[sendVoiceNote]", error.message);
    return null;
  }
  return data as VoiceNote;
}

/** "Print to tape" — keep a note past its 48h air window. */
export async function archiveNote(noteId: string): Promise<boolean> {
  const { error } = await supabase.from("voice_notes").update({ archived: true }).eq("id", noteId);
  if (error) {
    console.error("[archiveNote]", error.message);
    return false;
  }
  return true;
}
