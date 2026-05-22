# Notifications System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add in-app notification feed + Web Push to Fennec, with AI-generated copy and per-type user preferences.

**Architecture:** A `notifications` table stores all alerts; a `notification_preferences` table controls which types each user receives; a `push_subscriptions` table stores Web Push endpoints. A bell icon in the header opens a bottom sheet feed. A Vercel Cron job fires daily for deadline/scheduled reminders; news notifications are triggered when the cache-refresh cron runs. Audio feedback notifications are created immediately when a comment is posted.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL), `web-push` npm package, Anthropic Claude API (copy generation), Vercel Cron, Service Worker (public/sw.js)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `lib/notificationDb.ts` | Create | Supabase CRUD for notifications, preferences, push subscriptions |
| `lib/notificationCopy.ts` | Create | Claude API call to generate notification text; fallback templates |
| `lib/pushSend.ts` | Create | Web Push send helper using `web-push` |
| `app/api/push/subscribe/route.ts` | Create | Save push subscription to Supabase |
| `app/api/push/unsubscribe/route.ts` | Create | Remove push subscription |
| `app/api/cron/notifications/route.ts` | Create | Daily cron: deadline + content_scheduled notifications |
| `components/notifications/NotificationBell.tsx` | Create | Bell icon with unread badge + bottom sheet feed |
| `components/notifications/NotificationSheet.tsx` | Create | Bottom sheet listing notifications, mark-as-read |
| `components/settings/NotificationPreferences.tsx` | Create | Four toggles in Settings |
| `components/settings/SettingsModule.tsx` | Modify | Add "notifications" section + wire NotificationPreferences |
| `components/pricing/PricingCalculator.tsx` | Modify | Add NotificationBell to header, left of settings gear |
| `lib/audioDb.ts` | Modify | After creating a review_comment, trigger notification |
| `app/api/cache-refresh/route.ts` | Modify | After refreshing news, trigger industry_news notifications |
| `public/sw.js` | Create | Service worker: handle push events, show OS notification |
| `vercel.json` | Modify | Add cron entry for `/api/cron/notifications` |

---

## Task 1: Database schema + CRUD

**Files:**
- Create: `lib/notificationDb.ts`

- [ ] **Step 1: Run SQL in Supabase dashboard**

Go to Supabase → SQL Editor and run:

```sql
-- Notifications
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('audio_feedback','content_scheduled','project_deadline','industry_news')),
  title text not null,
  body text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table notifications enable row level security;
create policy "Users see own notifications" on notifications
  for select using (auth.uid() = user_id);
create policy "Service role insert notifications" on notifications
  for insert with check (true);
create policy "Users update own notifications" on notifications
  for update using (auth.uid() = user_id);

-- Push subscriptions
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
create policy "Users manage own push subs" on push_subscriptions
  for all using (auth.uid() = user_id);

-- Notification preferences
create table notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  audio_feedback boolean not null default true,
  content_scheduled boolean not null default true,
  project_deadline boolean not null default true,
  industry_news boolean not null default true
);
alter table notification_preferences enable row level security;
create policy "Users manage own prefs" on notification_preferences
  for all using (auth.uid() = user_id);
```

- [ ] **Step 2: Create `lib/notificationDb.ts`**

```typescript
import { supabase } from "./supabase";

export type NotificationType =
  | "audio_feedback"
  | "content_scheduled"
  | "project_deadline"
  | "industry_news";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  audio_feedback: boolean;
  content_scheduled: boolean;
  project_deadline: boolean;
  industry_news: boolean;
};

export type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

// ── Notifications ─────────────────────────────────────────────────

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return data ?? [];
}

export async function countUnread(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

export async function markOneRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId);
  if (error) throw error;
}

/** Creates a notification. Checks preferences first — silently skips if type is disabled. */
export async function createNotification(params: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
}): Promise<Notification | null> {
  // Check preference
  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select(params.type)
    .eq("user_id", params.userId)
    .single();

  // If row doesn't exist yet (first time), treat as enabled
  if (prefs && prefs[params.type] === false) return null;

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Preferences ───────────────────────────────────────────────────

export async function fetchPreferences(userId: string): Promise<NotificationPreferences> {
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error && error.code === "PGRST116") {
    // Row doesn't exist — return defaults
    return {
      user_id: userId,
      audio_feedback: true,
      content_scheduled: true,
      project_deadline: true,
      industry_news: true,
    };
  }
  if (error) throw error;
  return data;
}

export async function upsertPreferences(prefs: NotificationPreferences): Promise<void> {
  const { error } = await supabase
    .from("notification_preferences")
    .upsert(prefs);
  if (error) throw error;
}

// ── Push subscriptions ────────────────────────────────────────────

export async function savePushSubscription(row: PushSubscriptionRow): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(row, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}

export async function fetchPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function fetchAllPushSubscriptions(): Promise<PushSubscriptionRow[]> {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("*");
  if (error) throw error;
  return data ?? [];
}
```

- [ ] **Step 3: Verify TypeScript**

Run from project root:
```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/notificationDb.ts
git commit -m "feat: add notification DB types and CRUD functions"
```

---

## Task 2: AI copy generation + push send helper

**Files:**
- Create: `lib/notificationCopy.ts`
- Create: `lib/pushSend.ts`

- [ ] **Step 1: Install web-push**

```bash
npm install web-push
npm install --save-dev @types/web-push
```

Expected output: `added N packages`

- [ ] **Step 2: Generate VAPID keys**

```bash
node -e "const wp = require('web-push'); const keys = wp.generateVAPIDKeys(); console.log(JSON.stringify(keys, null, 2));"
```

Copy the output. Add these two env vars to Vercel (Settings → Environment Variables) and to your local `.env.local`:
```
VAPID_PUBLIC_KEY=<publicKey from output>
VAPID_PRIVATE_KEY=<privateKey from output>
VAPID_EMAIL=mailto:pacosalazcomposer@gmail.com
```

- [ ] **Step 3: Create `lib/notificationCopy.ts`**

```typescript
import Anthropic from "@anthropic-ai/sdk";
import type { NotificationType } from "./notificationDb";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

type CopyContext = {
  type: NotificationType;
  commenterUsername?: string;
  trackTitle?: string;
  firstTimestamp?: string;
  contentTitle?: string;
  projectName?: string;
  newsHeadline?: string;
};

const FALLBACKS: Record<NotificationType, (ctx: CopyContext) => string> = {
  audio_feedback: (ctx) =>
    ctx.commenterUsername && ctx.trackTitle
      ? `@${ctx.commenterUsername} left feedback on "${ctx.trackTitle}"`
      : "Someone left feedback on your track",
  content_scheduled: (ctx) =>
    ctx.contentTitle
      ? `Time to post "${ctx.contentTitle}" — your audience is waiting`
      : "You have content scheduled to post today",
  project_deadline: (ctx) =>
    ctx.projectName
      ? `"${ctx.projectName}" is due tomorrow — final push!`
      : "A project deadline is tomorrow",
  industry_news: (ctx) =>
    ctx.newsHeadline ?? "New industry news just dropped",
};

export async function generateNotificationCopy(ctx: CopyContext): Promise<string> {
  try {
    const prompt = buildPrompt(ctx);
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 60,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (message.content[0] as { type: string; text: string }).text?.trim() ?? "";
    // Clamp to 80 chars
    return text.length > 0 ? text.slice(0, 80) : FALLBACKS[ctx.type](ctx);
  } catch {
    return FALLBACKS[ctx.type](ctx);
  }
}

function buildPrompt(ctx: CopyContext): string {
  const base =
    "Write a single short push notification message (max 80 characters, no quotes). " +
    "Be natural, warm, and relevant. Include an emoji at the end. ";

  switch (ctx.type) {
    case "audio_feedback":
      return (
        base +
        `Context: @${ctx.commenterUsername} left a comment on the track "${ctx.trackTitle}".` +
        (ctx.firstTimestamp ? ` They referenced timestamp ${ctx.firstTimestamp}.` : "")
      );
    case "content_scheduled":
      return base + `Context: The user has content titled "${ctx.contentTitle}" scheduled to post today.`;
    case "project_deadline":
      return base + `Context: The project "${ctx.projectName}" is due tomorrow.`;
    case "industry_news":
      return base + `Context: New industry news: "${ctx.newsHeadline}". Write a short teaser.`;
  }
}
```

- [ ] **Step 4: Create `lib/pushSend.ts`**

```typescript
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
    // 410 Gone = subscription expired/unsubscribed
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
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/notificationCopy.ts lib/pushSend.ts package.json package-lock.json
git commit -m "feat: add notification copy generation and web push helper"
```

---

## Task 3: Service worker + push subscription API routes

**Files:**
- Create: `public/sw.js`
- Create: `app/api/push/subscribe/route.ts`
- Create: `app/api/push/unsubscribe/route.ts`

- [ ] **Step 1: Create `public/sw.js`**

```javascript
self.addEventListener("push", (event) => {
  let data = { title: "Fennec", body: "" };
  try { data = JSON.parse(event.data?.text() ?? "{}"); } catch {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body ?? "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { type: data.type },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
```

- [ ] **Step 2: Create `app/api/push/subscribe/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { savePushSubscription } from "@/lib/notificationDb";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await savePushSubscription({
      user_id: user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe]", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create `app/api/push/unsubscribe/route.ts`**

```typescript
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
```

- [ ] **Step 4: Add `SUPABASE_SERVICE_ROLE_KEY` to environment**

In Supabase → Settings → API, copy the `service_role` key (not the anon key).
Add to Vercel environment variables and local `.env.local`:
```
SUPABASE_SERVICE_ROLE_KEY=<your service role key>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add public/sw.js app/api/push/subscribe/route.ts app/api/push/unsubscribe/route.ts
git commit -m "feat: add service worker and push subscription API routes"
```

---

## Task 4: Daily cron + audio feedback trigger

**Files:**
- Create: `app/api/cron/notifications/route.ts`
- Modify: `lib/audioDb.ts`
- Modify: `app/api/cache-refresh/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create `app/api/cron/notifications/route.ts`**

```typescript
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "@/lib/notificationDb";
import { generateNotificationCopy } from "@/lib/notificationCopy";
import { sendPushToMany } from "@/lib/pushSend";

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // "YYYY-MM-DD"
  const todayStr = today.toISOString().split("T")[0];

  let deadlineCount = 0;
  let contentCount = 0;

  // ── Project deadlines ─────────────────────────────────────────
  const { data: projects } = await serviceSupabase
    .from("projects")
    .select("id, name, user_id, deadline")
    .gte("deadline", tomorrowStr + "T00:00:00Z")
    .lte("deadline", tomorrowStr + "T23:59:59Z");

  for (const project of projects ?? []) {
    const title = await generateNotificationCopy({
      type: "project_deadline",
      projectName: project.name,
    });
    const notification = await createNotification({
      userId: project.user_id,
      type: "project_deadline",
      title,
      body: project.name,
    });
    if (notification) {
      const subs = await fetchPushSubscriptionsForUser(project.user_id);
      await sendPushToMany(subs, { title, type: "project_deadline" }, (endpoint) =>
        deletePushSubscription(endpoint)
      );
      deadlineCount++;
    }
  }

  // ── Content scheduled ─────────────────────────────────────────
  const { data: contentTasks } = await serviceSupabase
    .from("content_tasks")
    .select("id, title, user_id, date")
    .eq("date", todayStr);

  for (const task of contentTasks ?? []) {
    const title = await generateNotificationCopy({
      type: "content_scheduled",
      contentTitle: task.title,
    });
    const notification = await createNotification({
      userId: task.user_id,
      type: "content_scheduled",
      title,
      body: task.title,
    });
    if (notification) {
      const subs = await fetchPushSubscriptionsForUser(task.user_id);
      await sendPushToMany(subs, { title, type: "content_scheduled" }, (endpoint) =>
        deletePushSubscription(endpoint)
      );
      contentCount++;
    }
  }

  return NextResponse.json({ ok: true, deadlineCount, contentCount });
}

export const GET = handler;
export const POST = handler;
```

- [ ] **Step 2: Check the actual table/column names for projects and content_tasks**

Run in Supabase SQL Editor:
```sql
select column_name from information_schema.columns where table_name = 'projects';
select column_name from information_schema.columns where table_name = 'content_tasks';
```
If the column names differ from `name`, `deadline`, `title`, `date` — update the cron route accordingly.

- [ ] **Step 3: Modify `lib/audioDb.ts` — trigger audio_feedback notification after comment insert**

In `createReviewComment`, after the successful insert, add:

```typescript
// at top of file, add import:
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "./notificationDb";
import { generateNotificationCopy } from "./notificationCopy";
import { sendPushToMany } from "./pushSend";
```

Replace the existing `createReviewComment` function with:

```typescript
export async function createReviewComment(params: {
  trackId: string;
  userId: string;
  body: string;
  timestampSeconds: number | null;
}): Promise<ReviewComment> {
  const { data, error } = await supabase
    .from("review_comments")
    .insert({
      track_id:          params.trackId,
      user_id:           params.userId,
      body:              params.body,
      timestamp_seconds: params.timestampSeconds,
    })
    .select(`*`)
    .single();
  if (error) throw error;

  // Notify track owner (fire and forget — don't fail the comment if notification fails)
  void (async () => {
    try {
      const { data: track } = await supabase
        .from("project_reviews")
        .select("user_id, title")
        .eq("id", params.trackId)
        .single();
      if (!track || track.user_id === params.userId) return; // don't notify yourself

      const { data: commenterProfile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", params.userId)
        .single();

      const firstTimestamp = params.timestampSeconds
        ? `${Math.floor(params.timestampSeconds / 60)}:${String(params.timestampSeconds % 60).padStart(2, "0")}`
        : undefined;

      const title = await generateNotificationCopy({
        type: "audio_feedback",
        commenterUsername: commenterProfile?.username ?? "Someone",
        trackTitle: track.title,
        firstTimestamp,
      });

      const notification = await createNotification({
        userId: track.user_id,
        type: "audio_feedback",
        title,
        body: track.title,
      });

      if (notification) {
        const subs = await fetchPushSubscriptionsForUser(track.user_id);
        await sendPushToMany(subs, { title, type: "audio_feedback" }, (endpoint) =>
          deletePushSubscription(endpoint)
        );
      }
    } catch (err) {
      console.error("[audio_feedback notification]", err);
    }
  })();

  return data;
}
```

- [ ] **Step 4: Modify `app/api/cache-refresh/route.ts` — trigger industry_news notifications**

After the upsert calls succeed, add industry_news notifications. Add these imports at the top:

```typescript
import { createClient } from "@supabase/supabase-js";
import { createNotification, fetchAllPushSubscriptions, deletePushSubscription } from "@/lib/notificationDb";
import { generateNotificationCopy } from "@/lib/notificationCopy";
import { sendPushToMany } from "@/lib/pushSend";
```

Add this block after the existing `await Promise.all([...upsert...])` calls:

```typescript
    // Send industry_news notifications for the first 3 new items
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const topItems = newsItems.slice(0, 3);
    for (const item of topItems) {
      const title = await generateNotificationCopy({
        type: "industry_news",
        newsHeadline: item.headline,
      });
      // Fetch all users to notify
      const { data: users } = await serviceSupabase
        .from("notification_preferences")
        .select("user_id")
        .eq("industry_news", true);
      for (const u of users ?? []) {
        await createNotification({
          userId: u.user_id,
          type: "industry_news",
          title,
          body: item.headline,
        });
      }
      // Push to all subscribed users who have industry_news enabled
      const allSubs = await fetchAllPushSubscriptions();
      const enabledUserIds = new Set((users ?? []).map((u) => u.user_id));
      const subs = allSubs.filter((s) => enabledUserIds.has(s.user_id));
      await sendPushToMany(subs, { title, type: "industry_news" }, (endpoint) =>
        deletePushSubscription(endpoint)
      );
      break; // Only send notification for the first new item to avoid spam
    }
```

- [ ] **Step 5: Update `vercel.json`**

```json
{
  "crons": [
    { "path": "/api/cache-refresh", "schedule": "0 7 * * *" },
    { "path": "/api/bot-post", "schedule": "0 15 * * *" },
    { "path": "/api/bot-post", "schedule": "0 0 * * *" },
    { "path": "/api/cron/notifications", "schedule": "0 12 * * *" }
  ]
}
```

- [ ] **Step 6: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors. Fix any import or type issues.

- [ ] **Step 7: Commit**

```bash
git add app/api/cron/notifications/route.ts lib/audioDb.ts app/api/cache-refresh/route.ts vercel.json
git commit -m "feat: add notification cron, audio feedback trigger, and news trigger"
```

---

## Task 5: NotificationBell + NotificationSheet UI

**Files:**
- Create: `components/notifications/NotificationBell.tsx`
- Create: `components/notifications/NotificationSheet.tsx`
- Modify: `components/pricing/PricingCalculator.tsx`

- [ ] **Step 1: Create `components/notifications/NotificationSheet.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import { Bell, Mic, Calendar, Clock, Newspaper, X, CheckCheck } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/notificationDb";
import { fetchNotifications, markAllRead, markOneRead } from "@/lib/notificationDb";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  audio_feedback: Mic,
  content_scheduled: Calendar,
  project_deadline: Clock,
  industry_news: Newspaper,
};

type Props = {
  userId: string;
  onClose: () => void;
  onRead: () => void; // called after marking read so bell badge updates
};

export default function NotificationSheet({ userId, onClose, onRead }: Props) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications(userId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  async function handleMarkAll() {
    await markAllRead(userId);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onRead();
  }

  async function handleTap(notification: Notification) {
    if (!notification.read) {
      await markOneRead(notification.id);
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      onRead();
    }
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div
        className="rounded-t-3xl bg-[#1a1a1e] border-t border-white/8 max-h-[75vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3 sticky top-0 bg-[#1a1a1e] border-b border-white/5">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-white">Notifications</span>
            {unreadCount > 0 && (
              <span className="text-xs bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="px-4 pt-3 space-y-1">
          {loading && (
            <p className="text-xs text-zinc-600 text-center py-8">Loading...</p>
          )}
          {!loading && items.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-8">No notifications yet.</p>
          )}
          {items.map((n) => {
            const Icon = TYPE_ICONS[n.type];
            return (
              <button
                key={n.id}
                onClick={() => handleTap(n)}
                className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition ${
                  n.read ? "bg-transparent" : "bg-amber-500/5 border border-amber-500/10"
                } hover:bg-white/5`}
              >
                <div className={`mt-0.5 shrink-0 ${n.read ? "text-zinc-600" : "text-amber-500"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${n.read ? "text-zinc-400" : "text-white"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="text-xs text-zinc-600 mt-0.5 truncate">{n.body}</p>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
                  {relativeTime(n.created_at)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create `components/notifications/NotificationBell.tsx`**

```typescript
"use client";
import { useEffect, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { countUnread } from "@/lib/notificationDb";
import NotificationSheet from "./NotificationSheet";

type Props = {
  userId: string;
};

export default function NotificationBell({ userId }: Props) {
  const [unread, setUnread]     = useState(0);
  const [open, setOpen]         = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const refreshCount = useCallback(() => {
    countUnread(userId).then(setUnread).catch(console.error);
  }, [userId]);

  // Poll every 60 seconds
  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  // Register service worker + request push permission once
  useEffect(() => {
    if (subscribed || typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });
        }

        const { endpoint, keys } = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        const { data: { session } } = await import("@/lib/supabase").then(
          (m) => m.supabase.auth.getSession()
        );

        if (session?.access_token) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ endpoint, keys }),
          });
          setSubscribed(true);
        }
      } catch (err) {
        console.error("[push register]", err);
      }
    })();
  }, [subscribed]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="relative flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-accent hover:border-accent/30 transition"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationSheet
          userId={userId}
          onClose={() => setOpen(false)}
          onRead={refreshCount}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` env var**

In `.env.local` and Vercel environment variables:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same publicKey from Task 2 Step 2>
```

- [ ] **Step 4: Modify `components/pricing/PricingCalculator.tsx` — add bell to header**

Add import at the top (near other component imports):
```typescript
import NotificationBell from "@/components/notifications/NotificationBell";
```

Find the header block (around line 506) that currently reads:
```tsx
      <div className={`flex w-full max-w-4xl items-center px-6 ${activeTab === "dashboard" ? "mb-0" : "mb-4"}`}>
        <div className="flex-1" />
        {activeTab === "dashboard" && profile.username && (
          <span className="text-xl font-bold text-amber-400">@{profile.username}</span>
        )}
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-accent hover:border-accent/30 transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
```

Replace with:
```tsx
      <div className={`flex w-full max-w-4xl items-center px-6 ${activeTab === "dashboard" ? "mb-0" : "mb-4"}`}>
        <div className="flex-1 flex justify-start">
          <NotificationBell userId={authUser.id} />
        </div>
        {activeTab === "dashboard" && profile.username && (
          <span className="text-xl font-bold text-amber-400">@{profile.username}</span>
        )}
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-accent hover:border-accent/30 transition"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/notifications/ components/pricing/PricingCalculator.tsx
git commit -m "feat: add notification bell and sheet UI"
```

---

## Task 6: Notification preferences in Settings

**Files:**
- Create: `components/settings/NotificationPreferences.tsx`
- Modify: `components/settings/SettingsModule.tsx`

- [ ] **Step 1: Create `components/settings/NotificationPreferences.tsx`**

```typescript
"use client";
import { useEffect, useState } from "react";
import { Mic, Calendar, Clock, Newspaper, ArrowLeft } from "lucide-react";
import type { NotificationPreferences } from "@/lib/notificationDb";
import { fetchPreferences, upsertPreferences } from "@/lib/notificationDb";

type Props = {
  userId: string;
  onBack: () => void;
};

type ToggleRow = {
  key: keyof Omit<NotificationPreferences, "user_id">;
  label: string;
  description: string;
  icon: React.ElementType;
};

const ROWS: ToggleRow[] = [
  {
    key: "audio_feedback",
    label: "Audio feedback",
    description: "When someone comments on your track",
    icon: Mic,
  },
  {
    key: "content_scheduled",
    label: "Content reminders",
    description: "Day-of reminders for scheduled posts",
    icon: Calendar,
  },
  {
    key: "project_deadline",
    label: "Project deadlines",
    description: "24h before a project is due",
    icon: Clock,
  },
  {
    key: "industry_news",
    label: "Industry news",
    description: "When new music industry news drops",
    icon: Newspaper,
  },
];

export default function NotificationPreferences({ userId, onBack }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences(userId).then(setPrefs).catch(console.error);
  }, [userId]);

  async function toggle(key: keyof Omit<NotificationPreferences, "user_id">) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await upsertPreferences(updated);
    } catch (err) {
      console.error(err);
      setPrefs(prefs); // revert on error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full px-4 pt-2 pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h2 className="text-sm font-bold text-white mb-4">Notification Preferences</h2>

      {!prefs ? (
        <p className="text-xs text-zinc-600 py-8 text-center">Loading...</p>
      ) : (
        <div className="space-y-1">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const enabled = prefs[row.key];
            return (
              <button
                key={row.key}
                onClick={() => toggle(row.key)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition text-left"
              >
                <div className={`shrink-0 ${enabled ? "text-amber-500" : "text-zinc-600"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{row.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{row.description}</p>
                </div>
                {/* Toggle pill */}
                <div
                  className={`shrink-0 w-10 h-6 rounded-full transition-colors ${
                    enabled ? "bg-amber-500" : "bg-white/10"
                  } flex items-center px-1`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Modify `components/settings/SettingsModule.tsx` — add notifications section**

Read the file first to find the exact `Section` type and `menuItems` array. Then:

Add `"notifications"` to the `Section` type:
```typescript
type Section = "main" | "profile" | "language" | "currency" | "data" | "notifications";
```

Add import at the top:
```typescript
import NotificationPreferences from "./NotificationPreferences";
import { Bell } from "lucide-react";
```

Add a section render block before the `return` for the main menu (place it with the other section renders):
```typescript
if (section === "notifications") return (
  <NotificationPreferences userId={userId} onBack={() => setSection("main")} />
);
```

Add `userId` prop to `SettingsModule`:
```typescript
type Props = {
  onBack: () => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  avatarUrl: string | null;
  onSignOut: () => Promise<void>;
  userId: string;
};
```

Add to the `menuItems` array (after the existing items, before the sign-out section):
```typescript
{
  icon: Bell,
  label: "Notifications",
  section: "notifications" as Section,
},
```

- [ ] **Step 3: Pass `userId` to SettingsModule in `PricingCalculator.tsx`**

Find the `<SettingsModule` usage and add `userId={authUser.id}`:
```tsx
<SettingsModule
  onBack={() => setShowSettings(false)}
  language={i18n.resolvedLanguage ?? "en"}
  onLanguageChange={(lang) => { void i18n.changeLanguage(lang); }}
  avatarUrl={profile.avatar_url}
  onSignOut={async () => { await supabase.auth.signOut(); }}
  userId={authUser.id}
/>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add components/settings/NotificationPreferences.tsx components/settings/SettingsModule.tsx components/pricing/PricingCalculator.tsx
git commit -m "feat: add notification preferences section to Settings"
```

---

## Self-Review

**Spec coverage check:**
- ✅ `notifications` table — Task 1
- ✅ `push_subscriptions` table — Task 1
- ✅ `notification_preferences` table — Task 1
- ✅ AI-generated copy with fallbacks — Task 2
- ✅ Web Push VAPID setup — Task 2
- ✅ Service worker — Task 3
- ✅ Push subscribe/unsubscribe API — Task 3
- ✅ Daily cron (deadline + content_scheduled) — Task 4
- ✅ `audio_feedback` trigger on comment insert — Task 4
- ✅ `industry_news` trigger on news cache refresh — Task 4
- ✅ Bell icon with unread badge in header — Task 5
- ✅ Notification sheet with mark-as-read — Task 5
- ✅ Per-type preference toggles in Settings — Task 6
- ✅ Preference check before creating notification — Task 1 (`createNotification`)

**Type consistency:** `NotificationType`, `Notification`, `NotificationPreferences`, `PushSubscriptionRow` all defined in Task 1 and used consistently throughout.
