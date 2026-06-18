export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { stripe, PRICES } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, successUrl, cancelUrl } = await req.json();
  const priceId = plan === "yearly" ? PRICES.yearly : PRICES.monthly;

  // Reuse existing Stripe customer if available
  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("stripe_customer_id, email, full_name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? profile?.email ?? undefined,
      name: profile?.full_name ?? undefined,
      metadata: { supabase_uid: user.id },
    });
    customerId = customer.id;
    await getSupabaseAdmin()
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fennec.audio"}/?upgraded=1`,
    cancel_url: cancelUrl ?? `${process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fennec.audio"}/`,
    subscription_data: {
      metadata: { supabase_uid: user.id },
    },
  });

  return NextResponse.json({ url: session.url });
}
