export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: priv } = await getSupabaseAdmin()
    .from("profiles_private")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!priv?.stripe_customer_id) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }

  const session = await getStripe().billingPortal.sessions.create({
    customer: priv.stripe_customer_id,
    return_url: process.env.NEXT_PUBLIC_APP_URL ?? "https://app.fennec.audio",
  });

  return NextResponse.json({ url: session.url });
}
