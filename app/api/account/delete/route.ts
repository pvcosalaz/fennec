export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

// Permanent account deletion. Required by both the App Store and Google Play:
// a signed-in user must be able to delete their account and ALL associated
// data from within the app (not just deactivate, not "email us").
//
// Order matters, because two things do NOT cascade with the DB rows:
//   a. Stripe — cancel every live subscription first so the user is never
//      billed after leaving.
//   b. Storage — bucket files are not touched by Postgres cascades, and
//      community media paths carry no user id, so their URLs must be
//      collected from the user's rows BEFORE those rows are deleted.
// Then delete the profiles row (cascades profiles-referencing tables) and
// finally the auth user (cascades the rest, removes login). The auth-user
// deletion is the authoritative step; we only report success when it lands.
// Stripe/storage cleanup is best-effort — a hiccup there must never leave
// the account itself undeleted.

/** "…/storage/v1/object/public/<bucket>/<path>" → path, or null. */
function storagePath(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const i = url.indexOf(marker);
  return i === -1 ? null : decodeURIComponent(url.slice(i + marker.length));
}

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const uid = user.id;

  // ── 1. Cancel every live Stripe subscription (best-effort) ──
  // status:"all" then filter, so trialing/past_due/unpaid/paused don't
  // survive and keep billing (the first version only caught "active").
  try {
    const { data: priv } = await admin
      .from("profiles_private")
      .select("stripe_customer_id")
      .eq("id", uid)
      .single();
    if (priv?.stripe_customer_id) {
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({ customer: priv.stripe_customer_id, status: "all", limit: 100 });
      const live = subs.data.filter((s) => s.status !== "canceled" && s.status !== "incomplete_expired");
      await Promise.all(live.map((s) => stripe.subscriptions.cancel(s.id).catch((e) => {
        console.error(`[account/delete] could not cancel sub ${s.id}:`, e);
      })));
    }
  } catch (e) {
    console.error("[account/delete] stripe cancel failed (continuing):", e);
  }

  // ── 2. Collect the user's storage footprint while the rows still exist ──
  const communityAudio: string[] = [];
  const communityImages: string[] = [];
  try {
    // Community posts: media lives at un-prefixed paths, so read the URLs off
    // the rows. (gif_url is external Giphy — not ours to delete.)
    const { data: posts } = await admin
      .from("posts")
      .select("media_url, media_type")
      .eq("user_id", uid);
    for (const p of posts ?? []) {
      const audio = storagePath(p.media_url, "community-audio");
      if (audio) communityAudio.push(audio);
      const image = storagePath(p.media_url, "community-images");
      if (image) communityImages.push(image);
    }

    // Voice notes sent by the user (radio) — stored in community-audio.
    const { data: notes } = await admin
      .from("voice_notes")
      .select("audio_url")
      .eq("sender_id", uid);
    for (const n of notes ?? []) {
      const audio = storagePath(n.audio_url, "community-audio");
      if (audio) communityAudio.push(audio);
    }

    // Avatars: uploaded as avatars/{uid}-{ts}.{ext} — find by prefix.
    const { data: avatarFiles } = await admin.storage
      .from("community-images")
      .list("avatars", { limit: 100, search: uid });
    for (const f of avatarFiles ?? []) communityImages.push(`avatars/${f.name}`);
  } catch (e) {
    console.error("[account/delete] storage inventory failed (continuing):", e);
  }

  // ── 3. Delete storage files (best-effort) ──
  try {
    // The tape: project-reviews files live under the user's own folder.
    const { data: reviewFiles } = await admin.storage
      .from("project-reviews")
      .list(uid, { limit: 1000 });
    const reviewPaths = (reviewFiles ?? []).map((f) => `${uid}/${f.name}`);
    if (reviewPaths.length) await admin.storage.from("project-reviews").remove(reviewPaths);
    if (communityAudio.length) await admin.storage.from("community-audio").remove(communityAudio);
    if (communityImages.length) await admin.storage.from("community-images").remove(communityImages);
  } catch (e) {
    console.error("[account/delete] storage cleanup failed (continuing):", e);
  }

  // ── 4. Delete the profile (cascades profiles-referencing data) ──
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", uid);
  if (profileErr) {
    console.error("[account/delete] profile delete failed:", profileErr);
  }

  // ── 5. Delete the auth user (authoritative; cascades the rest) ──
  const { error: delErr } = await admin.auth.admin.deleteUser(uid);
  if (delErr) {
    console.error("[account/delete] auth user delete failed:", delErr);
    return NextResponse.json({ error: "Could not delete account. Please try again or contact hello@fennec.audio." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
