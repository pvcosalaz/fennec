export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";

// Permanent account deletion. Required by both the App Store and Google Play:
// a signed-in user must be able to delete their account and ALL associated
// data from within the app (not just deactivate, not "email us").
//
// Order matters:
//   1. Cancel any live Stripe subscription so the user is never billed after
//      leaving. Best-effort: a Stripe hiccup must not block the deletion.
//   2. Delete the profiles row → cascades to profiles_private and every table
//      that references profiles(id) ON DELETE CASCADE.
//   3. Delete the auth user → cascades to every table that references
//      auth.users(id) ON DELETE CASCADE, and removes the ability to log in.
// The auth-user deletion is the authoritative step; we only report success
// when it succeeds.
export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ── 1. Cancel Stripe subscription (best-effort) ──
  try {
    const { data: priv } = await admin
      .from("profiles_private")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();
    if (priv?.stripe_customer_id) {
      const stripe = getStripe();
      const subs = await stripe.subscriptions.list({ customer: priv.stripe_customer_id, status: "active", limit: 10 });
      await Promise.all(subs.data.map((s) => stripe.subscriptions.cancel(s.id)));
    }
  } catch (e) {
    console.error("[account/delete] stripe cancel failed (continuing):", e);
  }

  // ── 2. Delete the profile (cascades profiles-referencing data) ──
  const { error: profileErr } = await admin.from("profiles").delete().eq("id", user.id);
  if (profileErr) {
    console.error("[account/delete] profile delete failed:", profileErr);
  }

  // ── 3. Delete the auth user (authoritative; cascades the rest) ──
  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("[account/delete] auth user delete failed:", delErr);
    return NextResponse.json({ error: "Could not delete account. Please try again or contact hello@fennec.audio." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
