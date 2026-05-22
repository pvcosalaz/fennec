export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "@/lib/notificationDb";
import { generateNotificationCopy } from "@/lib/notificationCopy";
import { sendPushToMany } from "@/lib/pushSend";

export async function POST(req: NextRequest) {
  try {
    const { trackOwnerId, trackTitle, commenterUsername, firstTimestamp } = await req.json() as {
      trackOwnerId: string;
      trackTitle: string;
      commenterUsername: string;
      firstTimestamp?: string;
    };

    const title = await generateNotificationCopy({
      type: "audio_feedback",
      commenterUsername,
      trackTitle,
      firstTimestamp,
    });

    const notification = await createNotification({
      userId: trackOwnerId,
      type: "audio_feedback",
      title,
      body: trackTitle,
    });

    if (notification) {
      const subs = await fetchPushSubscriptionsForUser(trackOwnerId);
      await sendPushToMany(subs, { title, type: "audio_feedback" }, (endpoint) =>
        deletePushSubscription(endpoint)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications/audio-feedback]", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
