# Audio Module — Project Review Design

**Last updated:** 2026-05-21

---

## Goal

Evolve the existing Melody Bank into a full **Audio Module** with a community-driven track review feature. Producers can submit tracks for feedback; the community listens and leaves timestamped comments. Uploading is Pro-only; giving feedback is open to all users.

## Architecture

The current "Melody Bank" tab is renamed to **Audio** and gains three sub-tabs: **Review**, **Melody Bank**, and **Mine**. The Review tab is the primary entry point — it auto-loads a random track and prompts the user to leave feedback or pass. A karma gate limits consecutive skips to prevent free-riding.

**Tech stack:** Next.js App Router, Supabase (PostgreSQL + Storage), existing `communityDb` and `uploadAudio` utilities, React state for playback/waveform.

---

## Tab: Review

### Player UI
- Full-screen layout: album artwork (user-uploaded image or auto-generated gradient), category badge, track title, uploader handle, duration
- SVG organic waveform showing playback progress in amber (`#f5a623`), remaining in dark gray
- Playhead line tracks current position
- Standard playback controls: play/pause, seek by tapping waveform

### Actions
Two cards at the bottom:
- **Pass** — skip this track, move to next random track
- **Leave Feedback** — opens a bottom sheet with a text input

### Karma Gate
- Each user has a `skip_streak` counter (stored in component state, reset on session)
- After **4 consecutive passes** without leaving a comment, the Pass card is disabled
- A pill alert appears: **"Other producers need your help — leave a comment to keep listening"**
- Once the user submits at least one comment, the skip streak resets and Pass is re-enabled

### Track queue
- Tracks are fetched in random order from `project_reviews` table
- Excludes tracks uploaded by the current user
- Excludes tracks the current user has already reviewed in this session

---

## Tab: Mine (Upload)

- **Pro users only** — free users see an upsell prompt
- Accepts any audio format (WAV, MP3, AIFF, FLAC, etc.), max file size 100 MB
- Audio is **converted to MP3 on upload** (via ffmpeg on a serverless route or client-side via ffmpeg.wasm) before storing in Supabase Storage
- Fields:
  - **Title** (required, max 60 chars)
  - **Category** (required, one of: Demo / Missing Mix / Idea / Missing Master / Final Version)
  - **Artwork** (optional, square image, max 5 MB)
- Limit: **10 active tracks per Pro user**
- Track card shows: title, category badge, upload date, comment count, a button to delete

---

## Tab: Melody Bank

Unchanged from current implementation — personal recordings stored in IndexedDB, attachable to community posts.

---

## Feedback with Timestamps

- Leave Feedback opens a bottom sheet with a multiline text input
- The input detects time patterns (`2:32`, `0:45`, `1:05:12`) automatically
- Detected timestamps render as amber hyperlinks in the comment display
- Tapping a timestamp link seeks the player to that exact second
- Detection regex: `\b(\d{1,2}):([0-5]\d)(:[0-5]\d)?\b`
- Comments are stored with `timestamp_seconds: number | null` — if multiple timestamps exist in one comment, `timestamp_seconds` stores the first one found; the full raw text is preserved

---

## Database Schema

### Table: `project_reviews`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, default `gen_random_uuid()` |
| user_id | uuid | FK → auth.users |
| title | text | max 60 chars |
| category | text | enum: Demo, Missing Mix, Idea, Missing Master, Final Version |
| audio_url | text | Supabase Storage URL (MP3) |
| artwork_url | text | nullable |
| duration_seconds | integer | extracted at upload |
| created_at | timestamptz | default now() |

### Table: `review_comments`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| track_id | uuid | FK → project_reviews |
| user_id | uuid | FK → auth.users |
| body | text | raw comment text |
| timestamp_seconds | integer | nullable, first timestamp detected |
| created_at | timestamptz | default now() |

### Storage bucket: `project-reviews`
- One folder per user_id
- Audio stored as `.mp3`
- Artwork stored as `.jpg` / `.png`

---

## Access Control

| Action | Free user | Pro user |
|---|---|---|
| Browse Review tab | ✅ | ✅ |
| Leave feedback / comments | ✅ | ✅ |
| Upload track to Mine | ❌ (upsell) | ✅ |
| Delete own track | — | ✅ |

---

## Out of Scope (not in v1)

- Groups / private sharing — deferred until there's user demand
- Downloading tracks — listen and comment only
- Rating system / stars — text comments only
- Notifications when someone comments on your track — deferred (nice to have v2)
