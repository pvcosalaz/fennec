# Fennec Bot — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A bot account (`@fennec`) that automatically publishes industry news to the community feed twice a day, rewritten with personality using Claude Haiku.

**Architecture:** Vercel Cron hits a protected Next.js API route 2×/day. The route fetches news from the existing RSS pipeline, picks an unposted article, rewrites it with Claude Haiku in one of 3 random formats, and inserts it into Supabase as a post from the bot profile.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), Anthropic Claude Haiku, Vercel Cron

---

## 1. Bot Profile (Supabase)

A phantom user row in the `profiles` table — not linked to Supabase Auth, inserted once via SQL.

| Field | Value |
|-------|-------|
| `id` | `00000000-0000-0000-0000-000000fennec` (fixed UUID) |
| `username` | `fennec` |
| `avatar_url` | `/fennec-bot-avatar.png` (white logo on black bg, generated as part of impl) |
| `bio` | `Tu fuente de noticias de la industria musical 🦊` |
| `is_bot` | `true` |
| `is_pro` | `true` |

The `is_bot` boolean column is added to the `profiles` table via migration.

---

## 2. Duplicate Prevention Table

New Supabase table `bot_posted_urls`:

```sql
CREATE TABLE bot_posted_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text UNIQUE NOT NULL,
  posted_at timestamptz DEFAULT now()
);
```

Before posting, the route checks if a news item's URL already exists here. After posting, it inserts the URL.

Old entries (> 30 days) are safe to ignore — no cleanup needed for now.

---

## 3. API Route `/api/bot-post`

**File:** `app/api/bot-post/route.ts`

**Security:** Only accepts POST requests with header `Authorization: Bearer <CRON_SECRET>`. Returns 401 otherwise.

**Flow:**

1. Fetch news from `/api/news` (internal call to existing route)
2. Filter out URLs already in `bot_posted_urls`
3. If no new items → return 200 with `{ skipped: true }`
4. Pick one item at random from the remaining
5. Pick a format at random (1, 2, or 3):
   - **Format 1 — Resumen:** 2-3 sentences summarizing the news in a friendly, peer tone. No question. Ends with the source link.
   - **Format 2 — Resumen + pregunta:** Same summary, but closes with a genuine question to the community (e.g. "¿Qué opinan?", "¿Ya lo están usando?").
   - **Format 3 — Hot take:** A short opinion or reflection inspired by the news, without literally summarizing it. More conversational. May or may not include a question.
6. Call Claude Haiku with the chosen format prompt + news content
7. Map news category → PostCategory:
   - `AI` → `"music"`
   - `Plugins` → `"gear"`
   - `Sync` → `"sync"`
   - `Industry` → `"general"`
8. Insert post into Supabase `posts` table with `user_id = BOT_UUID`
9. Insert news URL into `bot_posted_urls`
10. Return `{ ok: true, postId }`

**Claude prompt template (injected with format and news):**

```
Eres el asistente oficial de Fennec, una app para productores musicales.
Tu tono es el de un colega creativo — directo, informado, sin ser formal.
Escribe en español. Máximo 280 caracteres de texto (sin contar el link).

Noticia: {headline}
Fuente: {source}
Resumen: {summary}

Formato solicitado: {format_instruction}
```

---

## 4. Vercel Cron

**File:** `vercel.json` (create at project root)

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

- `0 15 * * *` → 9am México (UTC-6)
- `0 0 * * *` → 6pm México (UTC-6)

Vercel injects `Authorization: Bearer <CRON_SECRET>` automatically on cron-triggered calls.

**Environment variables needed:**
- `ANTHROPIC_API_KEY` — Claude Haiku calls
- `CRON_SECRET` — set in Vercel dashboard, matches what Vercel sends

---

## 5. UI — PostCard Badge

In `PostCard.tsx`, when `post.profile.is_bot === true`:
- Show `@fennec` username as usual
- No special badge for now (TBD — will be designed separately)
- Avatar shows white Fennec logo on black background

The `is_bot` field is added to the `Profile` type in `communityTypes.ts`.

---

## 6. Bot Avatar

Generate a 200×200px PNG: black background, white Fennec logo centered.
Save to `public/fennec-bot-avatar.png`.

The bot profile row references this as a relative URL — since avatars are normally Supabase Storage URLs, we store the full public URL of this static asset instead (e.g. `https://fennec.app/fennec-bot-avatar.png`).

For local dev, we use the relative path `/fennec-bot-avatar.png` and it resolves from Next.js public folder.

---

## Out of Scope

- Admin UI to trigger the bot manually (future)
- "Oficial" badge design (future)
- Bot replying to comments (future)
- Multi-language posts (future)
