import { NextRequest, NextResponse } from "next/server";
import { deletePushSubscription } from "@/lib/notificationDb";

export async function POST(req: NextRequest) {
  try {
    const { endpoint } = await req.json() as { endpoint: string };
    await deletePushSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe]", err);
    return NextResponse.json({ error: "Failed to remove subscription" }, { status: 500 });
  }
}
