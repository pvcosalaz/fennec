export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICES } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  const priceId = plan === "yearly" ? PRICES.yearly : PRICES.monthly;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fennec.audio";
  const successUrl = `${appUrl}/?upgraded=1`;
  const cancelUrl  = `${appUrl}/`;

  // Reuse existing Stripe customer if available. stripe_customer_id lives in
  // profiles_private (service-role only); email comes from the auth user.
  const { data: priv } = await getSupabaseAdmin()
    .from("profiles_private")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = priv?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await getStripe().customers.create({
      email: user.email ?? undefined,
      metadata: { supabase_uid: user.id },
    });
    customerId = customer.id;
    await getSupabaseAdmin()
      .from("profiles_private")
      .upsert({ id: user.id, stripe_customer_id: customerId }, { onConflict: "id" });
  }

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { supabase_uid: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
