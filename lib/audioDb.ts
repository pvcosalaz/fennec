import { supabase } from "./supabase";
import type { ProjectReview, ReviewComment, TrackCategory } from "./audioTypes";
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "./notificationDb";
import { generateNotificationCopy } from "./notificationCopy";
import { sendPushToMany } from "./pushSend";

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

  return rows.slice(0, limit);
}

export async function fetchUserReviews(userId: string): Promise<ProjectReview[]> {
  const { data, error } = await supabase
    .from("project_reviews")
    .select(`*, comment_count:review_comments(count)`)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r,
    comment_count: r.comment_count?.[0]?.count ?? 0,
  }));
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

  if (error) throw error;
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
  return data ?? [];
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

      const title = await generateNotificationCopy({
        type: "audio_feedback",
        commenterUsername: commenterProfile?.username ?? "Someone",
        trackTitle: track.title,
        firstTimestamp,
      });

      const notification = await createNotification({
        userId: track.user_id,
        type: "audio_feedback",
        title,
        body: track.title,
      });

      if (notification) {
        const subs = await fetchPushSubscriptionsForUser(track.user_id);
        await sendPushToMany(subs, { title, type: "audio_feedback" }, (endpoint) =>
          deletePushSubscription(endpoint)
        );
      }
    } catch (err) {
      console.error("[audio_feedback notification]", err);
    }
  })();

  return data;
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
