import { supabase } from "./supabase";
import type { ProjectReview, ReviewComment, TrackCategory } from "./audioTypes";

// ── Helpers ───────────────────────────────────────────────────────

async function attachProfiles<T extends { user_id: string }>(
  rows: T[]
): Promise<(T & { profile?: { id: string; username: string; avatar_url: string | null } })[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  if (userIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, profile: profileMap.get(r.user_id) }));
}

// ── Project Reviews ───────────────────────────────────────────────

export async function fetchRandomReviews(
  excludeUserId: string,
  limit = 10
): Promise<ProjectReview[]> {
  const { data, error } = await supabase
    .from("project_reviews")
    .select(`*, comment_count:review_comments(count)`)
    .neq("user_id", excludeUserId)
    .order("created_at", { ascending: false })
    .limit(limit * 3); // fetch more than needed so we can shuffle client-side

  if (error) throw error;

  const rows = (data ?? []).map((r) => ({
    ...r,
    comment_count: r.comment_count?.[0]?.count ?? 0,
  }));

  // Shuffle
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }

  const sliced = rows.slice(0, limit);
  return attachProfiles(sliced);
}

export async function fetchUserReviews(userId: string): Promise<ProjectReview[]> {
  const { data, error } = await supabase
    .from("project_reviews")
    .select(`*, comment_count:review_comments(count)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data ?? []).map((r) => ({
    ...r,
    comment_count: r.comment_count?.[0]?.count ?? 0,
  }));
  return attachProfiles(rows);
}

export async function createReview(params: {
  userId: string;
  title: string;
  category: TrackCategory;
  audioUrl: string;
  artworkUrl: string | null;
  durationSeconds: number;
}): Promise<ProjectReview> {
  const { data, error } = await supabase
    .from("project_reviews")
    .insert({
      user_id:          params.userId,
      title:            params.title,
      category:         params.category,
      audio_url:        params.audioUrl,
      artwork_url:      params.artworkUrl,
      duration_seconds: params.durationSeconds,
    })
    .select(`*`)
    .single();

  if (error) {
    // Raised by the karma trigger (see supabase/migrations/20260703_karma.sql)
    if (error.message?.includes("NOT_ENOUGH_KARMA")) {
      throw new Error("NOT_ENOUGH_KARMA");
    }
    throw error;
  }
  return { ...data, comment_count: 0 };
}

export async function deleteReview(reviewId: string): Promise<void> {
  // Fetch URLs before deleting so we can clean up storage
  const { data: review, error: fetchError } = await supabase
    .from("project_reviews")
    .select("audio_url, artwork_url")
    .eq("id", reviewId)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from("project_reviews")
    .delete()
    .eq("id", reviewId);
  if (error) throw error;

  // Clean up storage files
  const pathsToDelete: string[] = [];
  if (review.audio_url) {
    const path = review.audio_url.split("/project-reviews/")[1];
    if (path) pathsToDelete.push(path);
  }
  if (review.artwork_url) {
    const path = review.artwork_url.split("/project-reviews/")[1];
    if (path) pathsToDelete.push(path);
  }
  if (pathsToDelete.length > 0) {
    await supabase.storage.from("project-reviews").remove(pathsToDelete);
  }
}

export async function countUserReviews(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("project_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}

// ── Review Comments ───────────────────────────────────────────────

export async function fetchReviewComments(trackId: string): Promise<ReviewComment[]> {
  const { data, error } = await supabase
    .from("review_comments")
    .select(`*`)
    .eq("track_id", trackId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return attachProfiles(data ?? []);
}

export async function createReviewComment(params: {
  trackId: string;
  userId: string;
  body: string;
  timestampSeconds: number | null;
}): Promise<ReviewComment> {
  const { data, error } = await supabase
    .from("review_comments")
    .insert({
      track_id:          params.trackId,
      user_id:           params.userId,
      body:              params.body,
      timestamp_seconds: params.timestampSeconds,
    })
    .select(`*`)
    .single();
  if (error) throw error;

  // Notify track owner (fire and forget — don't fail the comment if notification fails)
  void (async () => {
    try {
      const { data: track } = await supabase
        .from("project_reviews")
        .select("user_id, title")
        .eq("id", params.trackId)
        .single();
      if (!track || track.user_id === params.userId) return;

      const { data: commenterProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", params.userId)
        .single();

      const firstTimestamp = params.timestampSeconds
        ? `${Math.floor(params.timestampSeconds / 60)}:${String(params.timestampSeconds % 60).padStart(2, "0")}`
        : undefined;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return; // no token, endpoint requires auth — skip silently

      // Delegate all server-side work (copy generation, notification, push) to API route
      const baseUrl = typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL ?? "";
      const res = await fetch(`${baseUrl}/api/notifications/audio-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          trackOwnerId: track.user_id,
          trackTitle: track.title,
          commenterUsername: commenterProfile?.username ?? "Someone",
          firstTimestamp,
        }),
      });
      if (!res.ok) console.error("[audio_feedback notification] request failed", res.status);
    } catch (err) {
      console.error("[audio_feedback notification]", err);
    }
  })();

  return data;
}

// ── Karma ─────────────────────────────────────────────────────────

/** Current karma balance, or null if the column doesn't exist yet / error. */
export async function fetchKarma(userId: string): Promise<number | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("karma")
    .eq("id", userId)
    .single();
  if (error) return null;
  const k = (data as { karma?: number } | null)?.karma;
  return typeof k === "number" ? k : null;
}

/**
 * Track owner stamps a comment as "this helped" (+2 karma to its author).
 * All validation and the anti-collusion payout locks live server-side in
 * the stamp_comment RPC — the seal always lands, the payout may be gated
 * (once per commenter per track, max 3/week per artist→commenter pair).
 */
export async function stampComment(commentId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("stamp_comment", { p_comment_id: commentId });
  if (error) {
    console.error("[stampComment]", error.message);
    return false;
  }

  // Only notify "+2 karma" when the payout actually happened —
  // a payout-capped seal shouldn't send a lying notification.
  const karmaPaid = Boolean((data as { karma_paid?: boolean } | null)?.karma_paid);
  if (karmaPaid) {
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        await fetch("/api/notifications/karma-stamp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ commentId }),
        });
      } catch { /* fire and forget */ }
    })();
  }

  return true;
}

// ── Storage ───────────────────────────────────────────────────────

export async function uploadReviewAudio(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "mp3";
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("project-reviews")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("project-reviews").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadReviewArtwork(
  userId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/artwork-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("project-reviews")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("project-reviews").getPublicUrl(path);
  return data.publicUrl;
}
