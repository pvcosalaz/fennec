export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { KARMA_PACK } from "@/lib/karma";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fennec.audio";

  // Reuse existing Stripe customer if available (same pattern as Pro checkout)
  const { data: profile } = await getSupabaseAdmin()
    .from("profiles")
    .select("stripe_customer_id, email, full_name")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await getStripe().customers.create({
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

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { name: KARMA_PACK.name },
        unit_amount: KARMA_PACK.amountCents,
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/?karma_purchased=1`,
    cancel_url: `${appUrl}/`,
    metadata: {
      kind: "karma_pack",
      supabase_uid: user.id,
      karma: String(KARMA_PACK.karma),
    },
  });

  return NextResponse.json({ url: session.url });
}
