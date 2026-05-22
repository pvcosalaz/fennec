import webpush from "web-push";
import type { PushSubscriptionRow } from "./notificationDb";

let vapidInitialized = false;

function ensureVapid() {
  if (vapidInitialized) return;
  const email = process.env.VAPID_EMAIL;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!email || !publicKey || !privateKey) {
    throw new Error("Missing VAPID env vars (VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)");
  }
  const mailtoEmail = email.startsWith("mailto:") ? email : `mailto:${email}`;
  webpush.setVapidDetails(mailtoEmail, publicKey, privateKey);
  vapidInitialized = true;
}

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
    ensureVapid();
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
  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const result = await sendPush(sub, payload);
      if (!result.ok && result.expired && onExpired) {
        await onExpired(sub.endpoint);
      }
    })
  );
}
