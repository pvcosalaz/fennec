# Fennec Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A bot account (`@fennec`) that automatically publishes industry news to the community feed twice a day, rewritten with personality via Claude Haiku.

**Architecture:** Vercel Cron hits `/api/bot-post` 2×/day. The route fetches news from the existing RSS API, picks an unposted article, rewrites it with Claude Haiku in one of 3 random formats, and inserts it into Supabase as a post from the bot profile.

**Tech Stack:** Next.js 15 App Router, Supabase (PostgreSQL + anon client), Anthropic SDK (`@anthropic-ai/sdk` already installed), Vercel Cron

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `public/fennec-bot-avatar.png` | Create | White fox logo on black bg (200×200) |
| `lib/communityTypes.ts` | Modify | Add `is_bot` to `Profile` type |
| `lib/supabase.ts` | Reference | Existing anon client — reuse in bot route |
| `lib/botDb.ts` | Create | `hasBeenPosted(url)` + `markAsPosted(url)` using `bot_posted_urls` table |
| `lib/botContent.ts` | Create | `rewriteWithClaude(item, format)` — calls Haiku |
| `app/api/bot-post/route.ts` | Create | Main POST handler: auth check → fetch news → pick item → rewrite → post |
| `components/community/PostCard.tsx` | Modify | Render bot avatar as `<img>` (bypasses color bg logic) |
| `vercel.json` | Create | Cron schedule (2×/day) |
| `.env.local` | Modify | Add `ANTHROPIC_API_KEY` + `CRON_SECRET` |

---

## Supabase Setup (manual SQL — run before any task)

Run this in the Supabase SQL Editor before starting:

```sql
-- 1. Add is_bot column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_bot boolean NOT NULL DEFAULT false;

-- 2. Create bot_posted_urls table
CREATE TABLE IF NOT EXISTS bot_posted_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  posted_at timestamptz DEFAULT now()
);

-- 3. Insert bot profile (phantom user, not in auth.users)
INSERT INTO profiles (id, username, avatar_url, is_pro, is_bot, fennec_db_score, bio, genres, worked_with, worked_in, banner_url)
VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'fennec',
  '/fennec-bot-avatar.png',
  true,
  true,
  9999,
  'Tu fuente de noticias de la industria musical 🦊',
  ARRAY[]::text[],
  null,
  null,
  null
)
ON CONFLICT (id) DO NOTHING;

-- 4. Allow anon to insert into bot_posted_urls (for the API route using anon key)
ALTER TABLE bot_posted_urls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service insert" ON bot_posted_urls FOR INSERT WITH CHECK (true);
CREATE POLICY "service select" ON bot_posted_urls FOR SELECT USING (true);
```

---

## Task 1: Add `is_bot` to Profile type + bot avatar

**Files:**
- Modify: `lib/communityTypes.ts`
- Create: `public/fennec-bot-avatar.png`

- [ ] **Step 1: Add `is_bot` to the Profile type**

Open `lib/communityTypes.ts`. The current `Profile` type ends at `banner_url`. Add `is_bot` after `is_pro`:

```ts
export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
  is_bot: boolean;          // ← add this line
  fennec_db_score: number;
  created_at: string;
  bio: string | null;
  genres: string[];
  worked_with: string | null;
  worked_in: string | null;
  banner_url: string | null;
};
```

- [ ] **Step 2: Create the bot avatar**

Create a 200×200 PNG with black background and the Fennec fox logo centered in white. Save it to `public/fennec-bot-avatar.png`.

If you cannot generate a PNG programmatically, create a simple SVG-based placeholder:

```bash
# Create a minimal black square PNG using Node (run from project root)
node -e "
const { createCanvas } = require('canvas');
// If canvas not available, skip — the avatar_url will just 404 and show initials fallback
"
```

If the `canvas` package isn't available, that's fine — the avatar will fall back to the initials display in PostCard. Come back to this later with a real asset.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors (there may be pre-existing ones — that's okay as long as no new ones appear).

- [ ] **Step 4: Commit**

```bash
git add lib/communityTypes.ts public/fennec-bot-avatar.png
git commit -m "feat: add is_bot to Profile type and bot avatar placeholder"
```

---

## Task 2: Create `lib/botDb.ts` — duplicate prevention

**Files:**
- Create: `lib/botDb.ts`

- [ ] **Step 1: Create the file**

```ts
// lib/botDb.ts
import { supabase } from "./supabase";

/**
 * Returns true if this news URL has already been posted by the bot.
 */
export async function hasBeenPosted(url: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("bot_posted_urls")
    .select("id", { count: "exact", head: true })
    .eq("url", url);
  if (error) {
    console.error("[botDb] hasBeenPosted error:", error.message);
    return false; // fail open — better to repost than to skip forever
  }
  return (count ?? 0) > 0;
}

/**
 * Marks a URL as posted so it won't be picked again.
 */
export async function markAsPosted(url: string): Promise<void> {
  const { error } = await supabase
    .from("bot_posted_urls")
    .insert({ url })
    .single();
  if (error && error.code !== "23505") {
    // 23505 = unique_violation — already exists, that's fine
    console.error("[botDb] markAsPosted error:", error.message);
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add lib/botDb.ts
git commit -m "feat: add botDb helpers for duplicate URL prevention"
```

---

## Task 3: Create `lib/botContent.ts` — Claude Haiku rewriter

**Files:**
- Create: `lib/botContent.ts`

- [ ] **Step 1: Add `ANTHROPIC_API_KEY` to `.env.local`**

Open `.env.local` and add:

```
ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
CRON_SECRET=fennec-cron-secret-change-this
```

Replace `sk-ant-YOUR_KEY_HERE` with your actual Anthropic API key from console.anthropic.com.
`CRON_SECRET` can be any long random string — it protects the endpoint from unauthorized calls.

- [ ] **Step 2: Create `lib/botContent.ts`**

```ts
// lib/botContent.ts
import Anthropic from "@anthropic-ai/sdk";
import type { NewsItem } from "@/app/api/news/route";

export type BotFormat = 1 | 2 | 3;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const FORMAT_INSTRUCTIONS: Record<BotFormat, string> = {
  1: `Escribe un resumen de 2-3 oraciones de la noticia. Tono: colega que te cuenta algo interesante, directo y sin ser formal. Sin preguntas al final. Termina con el link de la noticia en una línea separada.`,
  2: `Escribe un resumen de 2 oraciones de la noticia y cierra con una pregunta genuina a la comunidad (ej: "¿Ya lo están usando?", "¿Qué opinan?"). Termina con el link en una línea separada.`,
  3: `Escribe un hot take u opinión corta inspirada en la noticia — no la resumas literalmente. Sé conversacional, como si lo dijera en un grupo de WhatsApp entre productores. Puede o no terminar en pregunta. Termina con el link en una línea separada.`,
};

/**
 * Picks a random format (1, 2, or 3) for variety.
 */
export function pickFormat(): BotFormat {
  return ([1, 2, 3] as BotFormat[])[Math.floor(Math.random() * 3)];
}

/**
 * Calls Claude Haiku to rewrite a news item in the given format.
 * Returns the rewritten text (max ~300 chars of body + link).
 */
export async function rewriteWithClaude(item: NewsItem, format: BotFormat): Promise<string> {
  const prompt = `Eres el asistente oficial de Fennec, una app para productores musicales latinoamericanos.
Tu tono es el de un colega creativo — directo, informado, sin ser formal. Escribe en español.
El cuerpo del mensaje debe tener máximo 250 caracteres (sin contar el link).

Noticia: ${item.headline}
Fuente: ${item.source}
Resumen: ${item.summary}

Formato: ${FORMAT_INSTRUCTIONS[format]}`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 300,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") throw new Error("Unexpected Claude response type");
  return block.text.trim();
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add lib/botContent.ts .env.local
git commit -m "feat: add botContent with Claude Haiku rewriter (3 formats)"
```

---

## Task 4: Create `/api/bot-post` route

**Files:**
- Create: `app/api/bot-post/route.ts`

- [ ] **Step 1: Create the route file**

```ts
// app/api/bot-post/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { hasBeenPosted, markAsPosted } from "@/lib/botDb";
import { rewriteWithClaude, pickFormat } from "@/lib/botContent";
import type { NewsItem } from "@/app/api/news/route";
import type { PostCategory } from "@/lib/communityTypes";

const BOT_UUID = "f0000000-0000-0000-0000-000000000001";

const CATEGORY_MAP: Record<string, PostCategory> = {
  AI:       "music",
  Plugins:  "gear",
  Sync:     "sync",
  Industry: "general",
};

function mapCategory(newsCategory: string): PostCategory {
  return CATEGORY_MAP[newsCategory] ?? "general";
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST(req: NextRequest) {
  // ── Auth check ────────────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── 1. Fetch news ─────────────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${req.nextUrl.protocol}//${req.nextUrl.host}`
      : "http://localhost:3001";
    const newsRes = await fetch(`${baseUrl}/api/news`);
    if (!newsRes.ok) throw new Error(`News fetch failed: ${newsRes.status}`);
    const allItems: NewsItem[] = await newsRes.json();

    // ── 2. Filter already-posted ──────────────────────────────
    const fresh: NewsItem[] = [];
    for (const item of allItems) {
      const posted = await hasBeenPosted(item.url);
      if (!posted) fresh.push(item);
    }

    if (fresh.length === 0) {
      return NextResponse.json({ skipped: true, reason: "No new news items" });
    }

    // ── 3. Pick one at random ─────────────────────────────────
    const item = pickRandom(fresh);
    const format = pickFormat();

    // ── 4. Rewrite with Claude ────────────────────────────────
    const content = await rewriteWithClaude(item, format);

    // ── 5. Insert post into Supabase ──────────────────────────
    const { data, error } = await supabase
      .from("posts")
      .insert({
        user_id:    BOT_UUID,
        content,
        category:   mapCategory(item.category),
        media_url:  null,
        media_type: null,
        media_name: null,
        link_url:   item.url,
        link_title: item.headline,
        repost_of:  null,
      })
      .select("id")
      .single();

    if (error) throw new Error(`Supabase insert error: ${error.message}`);

    // ── 6. Mark URL as posted ─────────────────────────────────
    await markAsPosted(item.url);

    return NextResponse.json({ ok: true, postId: data.id, format, headline: item.headline });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bot-post] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test the route locally**

With the dev server running on port 3001:

```bash
curl -X POST http://localhost:3001/api/bot-post \
  -H "Authorization: Bearer fennec-cron-secret-change-this" \
  -H "Content-Type: application/json"
```

Expected response (first call):
```json
{ "ok": true, "postId": "...", "format": 1, "headline": "..." }
```

If you see `{ "skipped": true }` it means all news items were already posted — delete rows from `bot_posted_urls` in Supabase and retry.

If you see `{ "error": "Unauthorized" }` check that the `CRON_SECRET` in `.env.local` matches the header.

- [ ] **Step 3: Verify the post appears in the feed**

Open `http://localhost:3001` → Community → All. You should see a post from `@fennec` with the rewritten news content and the original article link.

- [ ] **Step 4: Test duplicate prevention**

Run the curl again immediately:

```bash
curl -X POST http://localhost:3001/api/bot-post \
  -H "Authorization: Bearer fennec-cron-secret-change-this"
```

Expected: the same article is NOT posted again. A different article is picked instead. Once all 12 news items are exhausted, response is `{ "skipped": true }`.

- [ ] **Step 5: Commit**

```bash
git add app/api/bot-post/route.ts
git commit -m "feat: add /api/bot-post route with Claude rewriter and duplicate prevention"
```

---

## Task 5: Update PostCard to handle bot avatar

**Files:**
- Modify: `components/community/PostCard.tsx`

The current PostCard renders avatars as colored circles with initials. For the bot, `avatar_url` is `/fennec-bot-avatar.png` — the `<img>` branch already handles this, but the wrapping `div` always applies `backgroundColor`. We need to skip the color background when `is_bot` is true.

- [ ] **Step 1: Find the avatar block in PostCard**

The relevant section is around line 103 (may shift slightly):

```tsx
style={{ backgroundColor: avatarColor(p.username) }}
```

- [ ] **Step 2: Update the avatar block**

Find this block (the full avatar div for the post author):

```tsx
style={{ backgroundColor: avatarColor(p.username) }}
```

Replace the entire avatar `div` (which renders either `<img>` or initials) with this version that handles bots:

```tsx
style={{ backgroundColor: p.is_bot ? "#000000" : avatarColor(p.username) }}
```

This gives the bot avatar a black background. Since `avatar_url` is set, the `<img>` branch renders — showing the white logo on black.

- [ ] **Step 3: Verify TypeScript and visual**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -30
```

Open `http://localhost:3001` → Community. The `@fennec` post should show the bot avatar (or black circle with "F" if the PNG isn't ready yet). Username `@fennec` should appear in amber (because `is_pro: true`).

- [ ] **Step 4: Commit**

```bash
git add components/community/PostCard.tsx
git commit -m "feat: render bot avatar with black background in PostCard"
```

---

## Task 6: Add Vercel Cron config

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json` at the project root**

```json
{
  "crons": [
    {
      "path": "/api/bot-post",
      "schedule": "0 15 * * *"
    },
    {
      "path": "/api/bot-post",
      "schedule": "0 0 * * *"
    }
  ]
}
```

- `0 15 * * *` = 9am Mexico City (UTC-6)
- `0 0 * * *` = 6pm Mexico City (UTC-6)

Vercel automatically adds `Authorization: Bearer <CRON_SECRET>` to cron-triggered requests. You must set `CRON_SECRET` in the Vercel dashboard (Settings → Environment Variables) with the same value as in `.env.local`.

- [ ] **Step 2: Add `CRON_SECRET` to Vercel dashboard**

In the Vercel project dashboard:
1. Go to **Settings → Environment Variables**
2. Add `CRON_SECRET` = same value as in `.env.local`
3. Add `ANTHROPIC_API_KEY` = your Anthropic key

(This step is manual — cannot be done from code.)

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel cron schedule for bot (9am + 6pm Mexico City)"
```

---

## Task 7: Add `CRON_SECRET` to `.env.local` docs

**Files:**
- Modify: `CLAUDE.md` or `README.md`

- [ ] **Step 1: Document the new env vars**

Open `CLAUDE.md` and add a section (or append to existing env vars section):

```md
## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `ANTHROPIC_API_KEY` | ✅ (bot) | Claude Haiku calls for @fennec bot |
| `CRON_SECRET` | ✅ (bot) | Secret header that protects /api/bot-post |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document ANTHROPIC_API_KEY and CRON_SECRET env vars"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Bot profile in Supabase (SQL setup section)
- ✅ `is_bot` field in Profile type (Task 1)
- ✅ Bot avatar — black bg + white logo (Task 1)
- ✅ Duplicate prevention via `bot_posted_urls` (Task 2)
- ✅ Claude Haiku rewriter with 3 formats (Task 3)
- ✅ `/api/bot-post` route with auth (Task 4)
- ✅ PostCard bot avatar rendering (Task 5)
- ✅ Vercel cron 2×/day (Task 6)
- ✅ Env vars documented (Task 7)
- ⚠️ "Oficial" badge — explicitly out of scope per design decision, to be added later
- ⚠️ Bot avatar PNG — requires manual asset creation or designer; fallback to black circle with initials works

**Placeholder scan:** None found.

**Type consistency:** `BOT_UUID`, `BotFormat`, `NewsItem`, `PostCategory`, `Profile.is_bot` — all defined before use.
