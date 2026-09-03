<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `FENNEC_ANTHROPIC_KEY` | ✅ (bot + content) | Anthropic Claude API key — used by `/api/bot-post` and `/api/trending-ideas` |
| `YOUTUBE_API_KEY` | ✅ (content) | YouTube Data API key for trending ideas |
| `CRON_SECRET` | ✅ (bot) | Secret token protecting `/api/bot-post` from unauthorized calls. Must match Vercel env var. |
| `NEXT_PUBLIC_GIPHY_API_KEY` | Optional | Giphy API key for GIF picker in community |

## Bot (@fennec)

- Bot profile UUID: `f0000000-0000-0000-0000-000000000001`
- Posts 2×/day via Vercel Cron (9am + 6pm Mexico City)
- Endpoint: `POST /api/bot-post` (requires `Authorization: Bearer <CRON_SECRET>`)
- Duplicate prevention: `bot_posted_urls` table in Supabase
- To trigger manually: `curl -X POST https://your-domain/api/bot-post -H "Authorization: Bearer <CRON_SECRET>"`

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
The Feedback module follows the "La Cinta Marcada" system (DESIGN.md) — amber is
reserved for human presence only. Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.
