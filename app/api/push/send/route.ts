export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { fetchPushSubscriptionsForUser, deletePushSubscription } from "@/lib/notificationDb";
import { sendPushToMany } from "@/lib/pushSend";

export async function POST(req: NextRequest) {
  try {
    // Internal-only route — require shared secret
    const secret = process.env.CRON_SECRET;
    const auth = req.headers.get("authorization") ?? "";
    if (!secret || !auth || auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, title, type } = await req.json() as {
      userId: string;
      title: string;
      type: string;
    };

    const subs = await fetchPushSubscriptionsForUser(userId);
    await sendPushToMany(subs, { title, type }, (endpoint) =>
      deletePushSubscription(endpoint)
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/send]", err);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
