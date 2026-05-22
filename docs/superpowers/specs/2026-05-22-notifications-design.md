# Notifications System — Design

**Last updated:** 2026-05-22

---

## Goal

Add an in-app notification feed and Web Push notifications to Fennec. Users receive timely, AI-generated alerts for audio feedback, upcoming content publish dates, project deadlines, and industry news. Each notification type can be toggled on/off per user in Settings.

## Architecture

Three components working together:

1. **`notifications` table in Supabase** — stores every notification with read/unread state
2. **Bell icon in the app header** — left side, same row as the settings gear, shows unread badge, opens a bottom sheet feed
3. **Web Push (VAPID)** — service worker + push subscription stored in Supabase, serverless cron sends pushes daily and on news/feedback events

**Tech stack:** Next.js App Router, Supabase (PostgreSQL), Anthropic Claude API (notification copy), Vercel Cron, Web Push (`web-push` npm package)

---

## Notification Types (v1)

| Type | Trigger | When |
|---|---|---|
| `audio_feedback` | Someone posts a comment on your track | Immediately on `review_comments` insert |
| `content_scheduled` | A content item has a publish date set to today | Daily cron at 12:00 pm UTC |
| `project_deadline` | A project's `deadline` is tomorrow | Daily cron at 12:00 pm UTC |
| `industry_news` | A new news item is added to the news feed | Immediately when news feed updates |

---

## AI-Generated Copy

At notification creation time, a call to the Claude API generates a short, natural message (max 80 chars) using event context. Examples:

- `audio_feedback`: *"@carlosbeatz left feedback on 'Violet' — check the 2:32 note 👂"*
- `content_scheduled`: *"Time to post 'How I made this beat' — your audience is waiting 🎬"*
- `project_deadline`: *"'Film Score — Trailer' is due tomorrow. Final push 🎯"*
- `industry_news`: *"Spotify raises streaming royalties for indie artists starting Q3 📈"*

If the Claude API call fails, a fallback static template is used instead so notifications are never silently dropped.

---

## Database Schema

### Table: `notifications`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| user_id | uuid | FK → auth.users |
| type | text | `audio_feedback` \| `content_scheduled` \| `project_deadline` \| `industry_news` |
| title | text | AI-generated short message (max 80 chars) |
| body | text | Optional secondary line (e.g. track title, project name, news preview) |
| read | boolean | default false |
| created_at | timestamptz | default now() |

### Table: `push_subscriptions`

| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → auth.users |
| endpoint | text | Push service endpoint URL |
| p256dh | text | Public key |
| auth | text | Auth secret |
| created_at | timestamptz | default now() |

### Table: `notification_preferences`

| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK, FK → auth.users |
| audio_feedback | boolean | default true |
| content_scheduled | boolean | default true |
| project_deadline | boolean | default true |
| industry_news | boolean | default true |

Row is created with all defaults on first login. Before sending any notification, the system checks the user's preference for that type — if false, neither the in-app notification nor the push is created.

---

## Web Push Flow

1. On first visit to the Audio tab (or via a settings prompt), the app requests push permission
2. Browser returns a `PushSubscription` object — app saves it to `push_subscriptions` via `/api/push/subscribe`
3. When a notification is created server-side, `/api/push/send` sends the push via `web-push` npm package
4. A service worker (`/public/sw.js`) handles incoming push events and shows the OS notification

---

## Cron Job

Route: `app/api/cron/notifications/route.ts`
Schedule: `0 12 * * *` (daily at 12:00 UTC) — configured in `vercel.json`

Logic:
1. Fetch all projects where `deadline = tomorrow` → create `project_deadline` notification + push per owner (if preference enabled)
2. Fetch all content tasks where `date = today` → create `content_scheduled` notification + push per owner (if preference enabled)

News notifications are triggered immediately when a new item is added to the news feed, not via the daily cron.

---

## In-App Bell UI

- Bell icon (`Bell` from lucide-react) in the top header, left of the settings gear
- Amber dot badge when `unread_count > 0`
- Tapping opens a bottom sheet with the last 30 notifications, newest first
- Each row: icon by type, AI-generated title, relative time ("2 min ago")
- Tapping a notification marks it as read (`read = true`)
- "Mark all as read" button at the top of the sheet
- Unread count fetched on mount and refreshed every 60 seconds via `setInterval`

---

## Notification Preferences UI

In the Settings module, a new **"Notifications"** section with four toggles:

| Toggle label | Type controlled |
|---|---|
| Audio feedback | `audio_feedback` |
| Content reminders | `content_scheduled` |
| Project deadlines | `project_deadline` |
| Industry news | `industry_news` |

Each toggle reads/writes `notification_preferences` in Supabase. Changes take effect immediately.

---

## Access Control

- All authenticated users can receive notifications
- Push permission is opt-in (browser prompt)
- Users only see their own notifications (RLS: `user_id = auth.uid()`)
- Users only see/edit their own preferences (RLS: `user_id = auth.uid()`)

---

## Out of Scope (v1)

- Email notifications — deferred
- Real-time in-app updates via Supabase Realtime — deferred (polling every 60s is sufficient for v1)
- Notification grouping (e.g. "3 people commented on Violet") — deferred
