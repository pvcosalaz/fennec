export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

async function setProStatus(customerId: string, isPro: boolean) {
  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) return;

  await getSupabaseAdmin()
    .from("profiles")
    .update({ is_pro: isPro })
    .eq("id", profile.id);
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
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error("[stripe/webhook] signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
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
