import webpush from "web-push";
import type { PushSubscriptionRow } from "./notificationDb";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export type PushPayload = {
  title: string;
  body?: string;
  type: string;
};

export async function sendPush(
  subscription: PushSubscriptionRow,
  payload: PushPayload
): Promise<{ ok: true } | { ok: false; expired: boolean }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload)
    );
    return { ok: true };
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode;
    return { ok: false, expired: status === 410 || status === 404 };
  }
}

export async function sendPushToMany(
  subscriptions: PushSubscriptionRow[],
  payload: PushPayload,
  onExpired?: (endpoint: string) => Promise<void>
): Promise<void> {
  await Promise.all(
    subscriptions.map(async (sub) => {
      const result = await sendPush(sub, payload);
      if (!result.ok && result.expired && onExpired) {
        await onExpired(sub.endpoint);
      }
    })
  );
}
