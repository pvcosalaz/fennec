export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { createNotification, fetchPushSubscriptionsForUser, deletePushSubscription } from "@/lib/notificationDb";
import { generateNotificationCopy } from "@/lib/notificationCopy";
import { sendPushToMany } from "@/lib/pushSend";


async function handler(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  const todayStr = today.toISOString().split("T")[0];

  let deadlineCount = 0;
  let contentCount = 0;

  // ── Project deadlines ─────────────────────────────────────────
  const { data: projects } = await getSupabaseAdmin()
    .from("business_projects")
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
      db: getSupabaseAdmin(),
    });
    if (notification) {
      const subs = await fetchPushSubscriptionsForUser(project.user_id, getSupabaseAdmin());
      await sendPushToMany(subs, { title, type: "project_deadline" }, (endpoint) =>
        deletePushSubscription(endpoint, getSupabaseAdmin())
      );
      deadlineCount++;
    }
  }

  // ── Content scheduled ─────────────────────────────────────────
  const { data: contentTasks } = await getSupabaseAdmin()
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
      db: getSupabaseAdmin(),
    });
    if (notification) {
      const subs = await fetchPushSubscriptionsForUser(task.user_id, getSupabaseAdmin());
      await sendPushToMany(subs, { title, type: "content_scheduled" }, (endpoint) =>
        deletePushSubscription(endpoint, getSupabaseAdmin())
      );
      contentCount++;
    }
  }

  return NextResponse.json({ ok: true, deadlineCount, contentCount });
}

export const GET = handler;
export const POST = handler;
