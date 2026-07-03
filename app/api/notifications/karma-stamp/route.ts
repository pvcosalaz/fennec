export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "@/lib/notificationDb";
import { sendPushToMany } from "@/lib/pushSend";

/**
 * Notifies a comment author that the track owner stamped their mark
 * ("this helped" → +2 karma). The client only sends the commentId;
 * everything else is derived and re-validated server-side so the
 * endpoint can't be used to spoof notifications.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = getSupabaseAdmin();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { commentId } = await req.json() as { commentId?: string };
    if (!commentId) return NextResponse.json({ error: "Missing commentId" }, { status: 400 });

    // Re-derive everything from the DB — trust nothing from the body
    const { data: comment } = await admin
      .from("review_comments")
      .select("id, user_id, track_id, stamped")
      .eq("id", commentId)
      .single();
    if (!comment || !comment.stamped) {
      return NextResponse.json({ error: "Comment not stamped" }, { status: 400 });
    }

    const { data: track } = await admin
      .from("project_reviews")
      .select("user_id, title")
      .eq("id", comment.track_id)
      .single();
    if (!track || track.user_id !== user.id) {
      return NextResponse.json({ error: "Not track owner" }, { status: 403 });
    }
    if (comment.user_id === user.id) {
      return NextResponse.json({ error: "Cannot notify self" }, { status: 400 });
    }

    const { data: ownerProfile } = await admin
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();

    const owner = ownerProfile?.username ?? "The artist";
    const title = `@${owner} sealed your mark on "${track.title}" — +2 karma ⚡`;

    // Reuses the audio_feedback preference bucket (it IS feedback activity);
    // a dedicated type would need a preferences migration — not worth it yet.
    const notification = await createNotification({
      userId: comment.user_id,
      type: "audio_feedback",
      title,
      body: track.title,
    });

    if (notification) {
      const subs = await fetchPushSubscriptionsForUser(comment.user_id);
      await sendPushToMany(subs, { title, type: "audio_feedback" }, (endpoint) =>
        deletePushSubscription(endpoint)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications/karma-stamp]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
