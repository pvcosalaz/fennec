export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

async function setProStatus(customerId: string, isPro: boolean) {
  // The customer id lives in profiles_private now; is_pro stays on profiles.
  const { data: priv } = await getSupabaseAdmin()
    .from("profiles_private")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!priv) return;

  await getSupabaseAdmin()
    .from("profiles")
    .update({ is_pro: isPro })
    .eq("id", priv.id);
}

/** Credits a purchased karma pack. Idempotent: the ledger records the
 *  Stripe session id, so webhook retries never credit twice. */
async function creditKarmaPurchase(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_uid;
  const karma = parseInt(session.metadata?.karma ?? "", 10);
  if (!userId || !Number.isFinite(karma) || karma <= 0) {
    console.error("[stripe/webhook] karma_pack session missing metadata", session.id);
    return;
  }

  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("karma_ledger")
    .select("id")
    .eq("reason", "purchase")
    .eq("ref_id", session.id)
    .maybeSingle();
  if (existing) return; // retry — already credited

  const { data: profile } = await admin
    .from("profiles")
    .select("karma")
    .eq("id", userId)
    .single();
  if (!profile) {
    console.error("[stripe/webhook] karma_pack: profile not found", userId);
    return;
  }

  await admin
    .from("profiles")
    .update({ karma: (profile.karma ?? 0) + karma })
    .eq("id", userId);
  await admin
    .from("karma_ledger")
    .insert({ user_id: userId, delta: karma, reason: "purchase", ref_id: session.id });
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe/webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Karma pack purchases identify the user via session metadata, not the
  // customer id — handle them before the customer-based subscription events.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (
      session.mode === "payment" &&
      session.metadata?.kind === "karma_pack" &&
      session.payment_status === "paid"
    ) {
      await creditKarmaPurchase(session);
    }
    return NextResponse.json({ received: true });
  }

  const customerId = (event.data.object as any)?.customer as string | undefined;
  if (!customerId) return NextResponse.json({ received: true });

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const active = sub.status === "active" || sub.status === "trialing";
      await setProStatus(customerId, active);
      break;
    }
    case "customer.subscription.deleted":
      await setProStatus(customerId, false);
      break;
    case "invoice.payment_failed":
      await setProStatus(customerId, false);
      break;
  }

  return NextResponse.json({ received: true });
}
