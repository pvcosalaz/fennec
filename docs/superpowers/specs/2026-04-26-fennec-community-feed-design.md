# Fennec Community Feed — Design Spec
**Date:** 2026-04-26  
**Status:** Approved  

---

## Overview

A music-producer-first social feed built into the Fennec app. Not a generic Twitter clone — every design decision is intentional for the producer community: music-native interaction names (Vibe, Loop), a waveform divider instead of a plain line, the Fennec fox logo as the PRO badge, and Fennec dB scores visible on every post.

---

## Decisions Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Who posts | Everyone (free + PRO) | Open community; PRO gets visual distinction |
| Content types | Text, audio, images, links, YouTube/Vimeo embeds, GIFs | No video uploads — but external video links (YouTube, Vimeo) render as inline players |
| "Like" equivalent | **Vibe** 🎵 | Producers already say "esto vibea" naturally |
| "Repost" equivalent | **Loop** 🔁 | "Este post está en loop" — musical metaphor |
| Feed structure | Global + filter chips | Simple to use, scales well, no follows needed v1 |
| Backend | Supabase | Auth + DB + Storage + free tier — one service covers everything |
| Auth | Google OAuth + email/password | Google covers ~90% of users; email/password as fallback |
| Social graph | No follows (v1) | Global feed; follows can be v2 once community has mass |
| PRO badge | Fennec fox logo in amber | More on-brand than text "PRO" badge |
| Post layout | Content-first, user centered below | Unique — content is the hero, user is the author |

---

## Categories (filter chips)

| Emoji | Name | Covers |
|-------|------|--------|
| 🎵 | **Music** | Melody Bank shares, loops, beats, music appreciation |
| 🎛️ | **Gear & Tools** | DAWs, plugins, virtual libraries, studio photos |
| 🎬 | **Sync & Scoring** | Film scoring, video games, sound design |
| 💼 | **Business** | Rates, opportunities, promote yourself, collabs |
| 🧠 | **Mindset** | Mental health, creative psychology, burnout, impostor syndrome |
| 💬 | **General** | Tips, memes, education, Q&A |

---

## Architecture

### Stack
- **Supabase Auth** — Google OAuth (primary) + email/password (fallback)
- **Supabase Database** — PostgreSQL for all social data
- **Supabase Storage** — Two buckets: `community-audio` and `community-images`
- **Next.js** (existing) — Supabase client used directly in components; no extra API routes needed for basic feed

### User Flow
1. User opens Fennec Community tab
2. If not authenticated → `AuthGate` (Google sign-in or email/password)
3. First login → username setup screen (creates profile row)
4. Access feed → filter by category → scroll posts
5. Tap ✍️ → `ComposerSheet` → write post + optional attach (audio/image/link)
6. From Melody Bank → share button → `MelodyPicker` → creates post with audio

---

## Database Schema

### `profiles`
Extends `auth.users` from Supabase.

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | FK → auth.users |
| `username` | text | Unique, chosen at first login |
| `avatar_url` | text | Optional, from Google or uploaded |
| `is_pro` | boolean | Controls amber Fennec badge |
| `fennec_db_score` | integer | Synced from local Fennec dB calculation |
| `created_at` | timestamptz | |

### `posts`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `user_id` | uuid | FK → profiles |
| `content` | text | The post text |
| `category` | text | `"music" \| "gear" \| "sync" \| "business" \| "mindset" \| "general"` |
| `media_url` | text | Supabase Storage URL (audio or image) |
| `media_type` | text | `"audio" \| "image" \| "link" \| null` |
| `media_name` | text | Display name for audio files |
| `link_url` | text | For link-type posts |
| `link_title` | text | Preview title for links |
| `repost_of` | uuid | FK → posts (null if original post) |
| `created_at` | timestamptz | |

### `vibes` (likes)

| Field | Type | Notes |
|-------|------|-------|
| `post_id` | uuid | FK → posts |
| `user_id` | uuid | FK → profiles |
| | | UNIQUE(post_id, user_id) |

### `comments`

| Field | Type | Notes |
|-------|------|-------|
| `id` | uuid | |
| `post_id` | uuid | FK → posts |
| `user_id` | uuid | FK → profiles |
| `content` | text | |
| `created_at` | timestamptz | |

### `bookmarks`

| Field | Type | Notes |
|-------|------|-------|
| `post_id` | uuid | FK → posts |
| `user_id` | uuid | FK → profiles |
| | | UNIQUE(post_id, user_id) |

### Supabase Storage Buckets

| Bucket | Access | Max size | Notes |
|--------|--------|----------|-------|
| `community-audio` | Public read | 10 MB | WebM audio from Melody Bank |
| `community-images` | Public read | 5 MB | Images attached to posts |

---

## Post Card Design

**Layout: Content-first, user centered below**

```
┌─────────────────────────────────┐
│ 🎵 Music                   2h  │  ← category chip + timestamp
│                                 │
│  "Acabo de terminar este loop   │
│   de Rhodes ¿qué opinan? 🎹"   │  ← content (text)
│                                 │
│  ┌─────────────────────────┐   │
│  │ ▶  Rhodes Loop #4       │   │  ← audio player (if media_type=audio)
│  │    ████░░░░░░  1:24     │   │
│  └─────────────────────────┘   │
│                                 │
│  ≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋≋  │  ← waveform divider (amber if audio, gray if text)
│                                 │
│     ◉ @paco  🦊  72 dB         │  ← avatar · username · PRO fox · dB score (centered)
│                                 │
├─────────────────────────────────┤
│   🎵 48    💬 12   🔁 7   🔖  │  ← Vibe · Comment · Loop · Save
└─────────────────────────────────┘
```

**Key details:**
- **Waveform divider** — SVG bars with amber gradient for audio posts, subtle gray gradient for text-only posts
- **PRO badge** — Fennec logo (`/public/fennec-logo.png`) rendered in amber using CSS `mask-image`. Small (28×14px), no text, no label. Appears between username and dB score. Free users have no badge.
  ```tsx
  // Implementation
  <div style={{
    width: 28, height: 14,
    backgroundColor: '#f59e0b',
    WebkitMaskImage: 'url(/fennec-logo.png)',
    maskImage: 'url(/fennec-logo.png)',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
  }} />
  ```
- **Fennec dB** — shown as `72 dB` in muted color next to username on every post
- **Vibe count** uses 🎵 icon (not ❤️)
- **Loop** = repost (🔁), creates a new post with `repost_of` pointing to original

---

## UI Components

| Component | Description |
|-----------|-------------|
| `AuthGate` | Login screen shown when user is not authenticated. Google button + email/password form. |
| `UsernameSetup` | One-time screen after first login to choose a username. |
| `FeedView` | Filter chips row + infinite scroll list of `PostCard`s. Filtered by category. |
| `PostCard` | Renders a single post: content, optional media, waveform divider, user info, action bar. |
| `AudioPlayer` | Mini inline player for audio posts (play/pause, progress bar, duration). |
| `ComposerSheet` | Bottom sheet for writing a new post. Fields: text, category selector, attach button (audio/image/link). |
| `MelodyPicker` | Modal showing recordings from the Melody Bank. Selecting one uploads it to `community-audio` and attaches it to the post. |
| `CommentsView` | Thread view (Twitter-style, flat). Post at top, comments below with scroll, input + GIF picker at bottom. Comment vibes supported. |
| `VideoEmbed` | Detects YouTube/Vimeo URLs, fetches oEmbed thumbnail, renders inline player on tap. |
| `GifPicker` | GIPHY search modal. Available in ComposerSheet and CommentsView. GIF stored as URL, no re-hosting. |

---

## What Already Exists

| Item | Status |
|------|--------|
| `Community.tsx` shell | ✅ Exists — will be rebuilt |
| Melody Bank (audio recordings) | ✅ IndexedDB — audio blobs available to pick |
| Fennec dB score | ✅ Calculated locally — needs to sync to `profiles` table |
| Next.js + Tailwind | ✅ Ready |

---

## Video Embeds (YouTube / Vimeo)

No video uploads to Fennec servers. However, when a user pastes a YouTube or Vimeo URL in a post, it is detected automatically and rendered as an inline embed player.

**How it works:**
- User pastes `https://youtube.com/watch?v=...` in the composer
- App detects the URL pattern, fetches oEmbed metadata (title, thumbnail)
- Post is saved with `media_type: "video-embed"` and `link_url`
- `PostCard` renders a thumbnail with a ▶ overlay; tapping opens the YouTube iframe inline
- No storage cost — video lives on YouTube

**Supported:** YouTube, Vimeo. Other links fall back to a standard link preview card.

---

## GIF Support

GIFs can be attached to posts and comments via the **GIPHY API** (free tier).

**How it works:**
- GIF picker button in `ComposerSheet` and `CommentsView` input
- Opens a modal with GIPHY search + trending GIFs
- Selected GIF is stored as a URL (no re-hosting) — `media_type: "gif"`, `media_url: giphy_url`
- Rendered inline in the post/comment card
- GIPHY free API: 100 requests/hour — sufficient for v1

---

## Comment Threads

Each post opens into a dedicated thread view, Twitter-style:

```
┌─────────────────────────────────┐
│  ← Back                         │
│                                 │
│  [Original post card]           │
│                                 │
│  ─────── 12 comments ────────  │
│                                 │
│  ◉ @user  · 1h                 │
│    Great loop! The chord voicing│
│    is perfect 🔥                │
│                                 │
│  ◉ @user2 · 30m                │
│    ¿Qué sample usaste?          │
│                                 │
│  ────────────────────────────── │
│  [Write a comment...] 🎵 GIF   │
└─────────────────────────────────┘
```

**Structure:** Flat (Twitter-style) — all comments reply to the original post. No nested replies in v1, keeps the UI simple. Nested replies can be v2.

**Comment actions:** Vibe (like a comment), reply mention (@username quoted, still flat).

---

## Out of Scope (v1)

- User follows / following feed
- Push notifications
- Post editing or deletion (can be v2)
- Video uploads (embeds are supported — uploads are not)
- Verified badges beyond PRO
- Direct messages
- Profile pages with post history (v2)
- Nested/threaded comment replies (v2)

---

## Open Questions

- Should Fennec dB sync to Supabase automatically on every app load, or only when the user posts?
  - **Recommended:** sync on Community tab open, debounced.
- Should free users be able to attach audio from Melody Bank, or only PRO?
  - **Recommended:** everyone can share audio — it's a core differentiator of Fennec Community.
