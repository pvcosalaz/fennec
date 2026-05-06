# Fennec Community Feed — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a music-producer-first social feed inside Fennec Community — with Supabase backend, Google auth, custom post layout, Vibe/Loop interactions, audio sharing from Melody Bank, GIFs, YouTube embeds, and comment threads.

**Architecture:** Supabase handles auth (Google OAuth + email/password), PostgreSQL database, and file storage. The Next.js client uses `@supabase/supabase-js` directly in components — no extra API routes needed for the feed. Community.tsx acts as the shell that routes between AuthGate → UsernameSetup → FeedView → CommentsView.

**Tech Stack:** Next.js 16 · TypeScript · Tailwind CSS · Supabase (auth + db + storage) · GIPHY API · YouTube oEmbed

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/supabase.ts` | Create | Supabase client singleton |
| `lib/communityDb.ts` | Create | All DB query functions (posts, vibes, comments, bookmarks) |
| `lib/communityTypes.ts` | Create | TypeScript types shared across community components |
| `components/community/Community.tsx` | Modify | Shell: routes between auth → setup → feed → thread |
| `components/community/AuthGate.tsx` | Create | Google + email/password login screen |
| `components/community/UsernameSetup.tsx` | Create | First-login username picker |
| `components/community/ProBadge.tsx` | Create | Amber Fennec logo badge (CSS mask) |
| `components/community/WaveformDivider.tsx` | Create | SVG waveform bar divider (amber/gray) |
| `components/community/AudioPlayerInline.tsx` | Create | Mini audio player for posts |
| `components/community/VideoEmbed.tsx` | Create | YouTube/Vimeo URL detection + iframe embed |
| `components/community/GifPicker.tsx` | Create | GIPHY search modal |
| `components/community/PostCard.tsx` | Create | Full post card with all media types + action bar |
| `components/community/FeedView.tsx` | Create | Filter chips + paginated post list |
| `components/community/ComposerSheet.tsx` | Create | Bottom sheet: write post + attach media |
| `components/community/MelodyPicker.tsx` | Create | Pick recording from Melody Bank → uploads to Supabase Storage |
| `components/community/CommentsView.tsx` | Create | Thread view: post + flat comments + comment input + GIF |
| `.env.local` | Modify | Add Supabase + GIPHY keys |

---

## Phase 1 — Supabase Setup (Manual + Code)

### Task 1: Create Supabase project and configure env vars

**Files:**
- Modify: `.env.local`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project. Name it `fennec`. Copy:
- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- Anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- [ ] **Step 2: Add keys to `.env.local`**

```bash
# Add to existing .env.local (keep YOUTUBE_API_KEY and FENNEC_ANTHROPIC_KEY)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_GIPHY_API_KEY=your_giphy_key_here
```

- [ ] **Step 3: Get GIPHY API key**

Go to https://developers.giphy.com → Create App → SDK → Copy API key → paste as `NEXT_PUBLIC_GIPHY_API_KEY`.

- [ ] **Step 4: Enable Google OAuth in Supabase**

Supabase Dashboard → Authentication → Providers → Google → Enable.
Follow the guide to create a Google Cloud OAuth client (https://supabase.com/docs/guides/auth/social-login/auth-google).
Add `http://localhost:3000` and your production URL to Authorized redirect URIs.

- [ ] **Step 5: Verify env vars load**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
node -e "require('dotenv').config({path:'.env.local'}); console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0,30))"
```
Expected: `Supabase URL: https://xxxxxxxxxxxx.sup`

---

### Task 2: Create database schema in Supabase

**Files:**
- Supabase SQL editor (no local file)

- [ ] **Step 1: Run schema SQL in Supabase SQL Editor**

Go to Supabase Dashboard → SQL Editor → New query → paste and run:

```sql
-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  is_pro boolean default false,
  fennec_db_score integer default 0,
  created_at timestamptz default now()
);

-- Posts
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null default '',
  category text not null check (category in ('music','gear','sync','business','mindset','general')),
  media_url text,
  media_type text check (media_type in ('audio','image','gif','video-embed','link',null)),
  media_name text,
  link_url text,
  link_title text,
  repost_of uuid references posts(id) on delete set null,
  created_at timestamptz default now()
);

-- Vibes (likes)
create table if not exists vibes (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- Comments
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  content text not null,
  gif_url text,
  created_at timestamptz default now()
);

-- Bookmarks
create table if not exists bookmarks (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);
```

- [ ] **Step 2: Enable Row Level Security (RLS)**

```sql
-- Enable RLS on all tables
alter table profiles enable row level security;
alter table posts enable row level security;
alter table vibes enable row level security;
alter table comments enable row level security;
alter table bookmarks enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_select" on profiles for select using (true);
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- Posts: anyone can read, authenticated users can insert
create policy "posts_select" on posts for select using (true);
create policy "posts_insert" on posts for insert with check (auth.uid() = user_id);

-- Vibes: anyone can read, authenticated users can insert/delete their own
create policy "vibes_select" on vibes for select using (true);
create policy "vibes_insert" on vibes for insert with check (auth.uid() = user_id);
create policy "vibes_delete" on vibes for delete using (auth.uid() = user_id);

-- Comments: anyone can read, authenticated users can insert
create policy "comments_select" on comments for select using (true);
create policy "comments_insert" on comments for insert with check (auth.uid() = user_id);

-- Bookmarks: users only see and manage their own
create policy "bookmarks_select" on bookmarks for select using (auth.uid() = user_id);
create policy "bookmarks_insert" on bookmarks for insert with check (auth.uid() = user_id);
create policy "bookmarks_delete" on bookmarks for delete using (auth.uid() = user_id);
```

- [ ] **Step 3: Create Storage buckets**

Supabase Dashboard → Storage → New bucket:
1. Name: `community-audio` · Public: ✅ · Max file size: 10MB
2. Name: `community-images` · Public: ✅ · Max file size: 5MB

Then run in SQL Editor:
```sql
-- Storage policies
create policy "audio_select" on storage.objects for select using (bucket_id = 'community-audio');
create policy "audio_insert" on storage.objects for insert with check (bucket_id = 'community-audio' and auth.role() = 'authenticated');

create policy "images_select" on storage.objects for select using (bucket_id = 'community-images');
create policy "images_insert" on storage.objects for insert with check (bucket_id = 'community-images' and auth.role() = 'authenticated');
```

- [ ] **Step 4: Verify tables exist**

In Supabase Table Editor, confirm you see: `profiles`, `posts`, `vibes`, `comments`, `bookmarks`.

---

### Task 3: Install Supabase and create client

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Install Supabase JS client**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npm install @supabase/supabase-js
```
Expected: `added X packages`

- [ ] **Step 2: Create Supabase client singleton**

Create `lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Verify client imports without error**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npm run build 2>&1 | grep -E "error|Error" | head -5
```
Expected: no errors mentioning `supabase.ts`

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add lib/supabase.ts package.json package-lock.json
git commit -m "feat: add Supabase client"
```

---

### Task 4: Create shared types and DB query functions

**Files:**
- Create: `lib/communityTypes.ts`
- Create: `lib/communityDb.ts`

- [ ] **Step 1: Create types**

Create `lib/communityTypes.ts`:

```typescript
export type PostCategory = "music" | "gear" | "sync" | "business" | "mindset" | "general";
export type MediaType = "audio" | "image" | "gif" | "video-embed" | "link" | null;

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
  fennec_db_score: number;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  category: PostCategory;
  media_url: string | null;
  media_type: MediaType;
  media_name: string | null;
  link_url: string | null;
  link_title: string | null;
  repost_of: string | null;
  created_at: string;
  // joined
  profile: Profile;
  vibe_count: number;
  comment_count: number;
  user_vibed: boolean;
  user_bookmarked: boolean;
  repost_post?: Post | null;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  gif_url: string | null;
  created_at: string;
  profile: Profile;
  vibe_count: number;
  user_vibed: boolean;
};

export const CATEGORIES: { id: PostCategory; label: string; emoji: string }[] = [
  { id: "music",    label: "Music",         emoji: "🎵" },
  { id: "gear",     label: "Gear & Tools",  emoji: "🎛️" },
  { id: "sync",     label: "Sync & Scoring",emoji: "🎬" },
  { id: "business", label: "Business",      emoji: "💼" },
  { id: "mindset",  label: "Mindset",       emoji: "🧠" },
  { id: "general",  label: "General",       emoji: "💬" },
];
```

- [ ] **Step 2: Create DB query functions**

Create `lib/communityDb.ts`:

```typescript
import { supabase } from "./supabase";
import type { Post, Comment, Profile, PostCategory, MediaType } from "./communityTypes";

const PAGE_SIZE = 20;

// ── Profiles ──────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}

export async function createProfile(userId: string, username: string, avatarUrl: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username, avatar_url: avatarUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDbScore(userId: string, score: number): Promise<void> {
  await supabase.from("profiles").update({ fennec_db_score: score }).eq("id", userId);
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("username", username);
  return (count ?? 0) > 0;
}

// ── Posts ─────────────────────────────────────────────────────────

export async function fetchPosts(
  category: PostCategory | null,
  page: number,
  currentUserId: string | null
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select(`
      *,
      profile:profiles(*),
      vibe_count:vibes(count),
      comment_count:comments(count)
    `)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;

  // Fetch user's vibes and bookmarks for these posts
  const postIds = (data ?? []).map((p) => p.id);
  let userVibes = new Set<string>();
  let userBookmarks = new Set<string>();

  if (currentUserId && postIds.length > 0) {
    const [vibesRes, bookmarksRes] = await Promise.all([
      supabase.from("vibes").select("post_id").eq("user_id", currentUserId).in("post_id", postIds),
      supabase.from("bookmarks").select("post_id").eq("user_id", currentUserId).in("post_id", postIds),
    ]);
    userVibes = new Set((vibesRes.data ?? []).map((v) => v.post_id));
    userBookmarks = new Set((bookmarksRes.data ?? []).map((b) => b.post_id));
  }

  return (data ?? []).map((p) => ({
    ...p,
    vibe_count: p.vibe_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
    user_vibed: userVibes.has(p.id),
    user_bookmarked: userBookmarks.has(p.id),
  }));
}

export async function createPost(params: {
  userId: string;
  content: string;
  category: PostCategory;
  mediaUrl?: string;
  mediaType?: MediaType;
  mediaName?: string;
  linkUrl?: string;
  linkTitle?: string;
  repostOf?: string;
}): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id:    params.userId,
      content:    params.content,
      category:   params.category,
      media_url:  params.mediaUrl ?? null,
      media_type: params.mediaType ?? null,
      media_name: params.mediaName ?? null,
      link_url:   params.linkUrl ?? null,
      link_title: params.linkTitle ?? null,
      repost_of:  params.repostOf ?? null,
    })
    .select(`*, profile:profiles(*)`)
    .single();
  if (error) throw error;
  return { ...data, vibe_count: 0, comment_count: 0, user_vibed: false, user_bookmarked: false };
}

// ── Vibes ─────────────────────────────────────────────────────────

export async function toggleVibe(postId: string, userId: string, currentlyVibed: boolean): Promise<void> {
  if (currentlyVibed) {
    await supabase.from("vibes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("vibes").insert({ post_id: postId, user_id: userId });
  }
}

// ── Bookmarks ─────────────────────────────────────────────────────

export async function toggleBookmark(postId: string, userId: string, currentlyBookmarked: boolean): Promise<void> {
  if (currentlyBookmarked) {
    await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("bookmarks").insert({ post_id: postId, user_id: userId });
  }
}

// ── Comments ──────────────────────────────────────────────────────

export async function fetchComments(postId: string, currentUserId: string | null): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, profile:profiles(*), vibe_count:vibes(count)`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    ...c,
    vibe_count: c.vibe_count?.[0]?.count ?? 0,
    user_vibed: false, // comment vibes use same vibes table — simplified for v1
  }));
}

export async function createComment(postId: string, userId: string, content: string, gifUrl?: string): Promise<Comment> {
  const { data, error } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: userId, content, gif_url: gifUrl ?? null })
    .select(`*, profile:profiles(*)`)
    .single();
  if (error) throw error;
  return { ...data, vibe_count: 0, user_vibed: false };
}

// ── Storage ───────────────────────────────────────────────────────

export async function uploadAudio(blob: Blob, filename: string): Promise<string> {
  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from("community-audio").upload(path, blob, {
    contentType: "audio/webm",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("community-audio").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("community-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("community-images").getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors in `lib/communityTypes.ts` or `lib/communityDb.ts`

- [ ] **Step 4: Commit**

```bash
git add lib/communityTypes.ts lib/communityDb.ts
git commit -m "feat: community types and DB query functions"
```

---

## Phase 2 — Auth

### Task 5: AuthGate component

**Files:**
- Create: `components/community/AuthGate.tsx`

- [ ] **Step 1: Create AuthGate**

Create `components/community/AuthGate.tsx`:

```typescript
"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Music2 } from "lucide-react";

export default function AuthGate() {
  const [mode, setMode]       = useState<"google" | "email">("google");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.message.includes("Invalid login")) {
      // Try sign up
      const { error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) setError(signUpErr.message);
    } else if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
      <div className="flex flex-col items-center gap-2">
        <img src="/fennec-logo.png" className="h-10 w-auto opacity-90" alt="Fennec" />
        <h1 className="text-2xl font-bold text-white">Fennec Community</h1>
        <p className="text-sm text-zinc-500 text-center">Conecta con otros productores musicales</p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-zinc-600">o</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-2">
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Entrar / Crear cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Start dev server and verify AuthGate renders**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npm run dev
```
Temporarily add `<AuthGate />` to Community.tsx and open the app → Community tab.
Expected: Google button + email form visible, no console errors.

- [ ] **Step 3: Commit**

```bash
git add components/community/AuthGate.tsx
git commit -m "feat: AuthGate with Google OAuth and email/password"
```

---

### Task 6: UsernameSetup component

**Files:**
- Create: `components/community/UsernameSetup.tsx`

- [ ] **Step 1: Create UsernameSetup**

Create `components/community/UsernameSetup.tsx`:

```typescript
"use client";
import { useState } from "react";
import { createProfile, isUsernameTaken } from "@/lib/communityDb";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  userId: string;
  avatarUrl: string | null;
  onComplete: (profile: Profile) => void;
};

export default function UsernameSetup({ userId, avatarUrl, onComplete }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) { setError("Mínimo 3 caracteres (letras, números, _)"); return; }
    setLoading(true);
    setError(null);
    const taken = await isUsernameTaken(clean);
    if (taken) { setError("Ese username ya está en uso"); setLoading(false); return; }
    try {
      const profile = await createProfile(userId, clean, avatarUrl);
      onComplete(profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creando perfil");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-white">Elige tu username</h2>
        <p className="text-sm text-zinc-500">Así te verán los demás productores</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="tuusername"
            maxLength={30}
            required
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 pl-7 pr-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || username.trim().length < 3}
          className="w-full h-11 rounded-xl bg-accent text-black text-sm font-semibold hover:bg-accent/90 transition disabled:opacity-50"
        >
          {loading ? "Guardando..." : "Entrar al feed →"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/community/UsernameSetup.tsx
git commit -m "feat: UsernameSetup for first-login username choice"
```

---

### Task 7: Wire auth into Community.tsx

**Files:**
- Modify: `components/community/Community.tsx`

- [ ] **Step 1: Replace Community.tsx shell**

Replace the entire `components/community/Community.tsx` with:

```typescript
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getProfile, updateDbScore } from "@/lib/communityDb";
import type { Profile, Post } from "@/lib/communityTypes";
import AuthGate from "./AuthGate";
import UsernameSetup from "./UsernameSetup";
import FeedView from "./FeedView";
import CommentsView from "./CommentsView";

type CommunityView = "feed" | "thread";

export default function CommunityModule() {
  const [authUser, setAuthUser]   = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile]     = useState<Profile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView]           = useState<CommunityView>("feed");
  const [activePost, setActivePost] = useState<Post | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id, email: user.email } : null);
      if (user) loadProfile(user.id);
      else setAuthLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setAuthUser(user ? { id: user.id, email: user.email } : null);
      if (user) loadProfile(user.id);
      else { setProfile(null); setAuthLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadProfile(userId: string) {
    const p = await getProfile(userId);
    setProfile(p);
    setAuthLoading(false);
    // Sync Fennec dB score (local → Supabase)
    if (p) {
      const localScore = Number(localStorage.getItem("fennec-db-score") ?? 0);
      if (localScore !== p.fennec_db_score) updateDbScore(userId, localScore);
    }
  }

  function openThread(post: Post) {
    setActivePost(post);
    setView("thread");
  }

  function closeThread() {
    setActivePost(null);
    setView("feed");
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!authUser) return <AuthGate />;
  if (!profile)  return <UsernameSetup userId={authUser.id} avatarUrl={null} onComplete={setProfile} />;

  if (view === "thread" && activePost) {
    return <CommentsView post={activePost} profile={profile} onBack={closeThread} />;
  }

  return <FeedView profile={profile} onOpenThread={openThread} />;
}
```

- [ ] **Step 2: Verify app loads without errors**

Open http://localhost:3000 → Community tab.
Expected: spinner → then AuthGate (if not logged in) or feed skeleton (if already logged in via Google).

- [ ] **Step 3: Test full auth flow**

1. Click "Continuar con Google" → redirects to Google → back to app
2. If first time: UsernameSetup appears → type a username → submit
3. Expected: profile saved in Supabase `profiles` table (verify in Table Editor)

- [ ] **Step 4: Commit**

```bash
git add components/community/Community.tsx
git commit -m "feat: wire auth flow into Community module"
```

---

## Phase 3 — Feed (Read)

### Task 8: ProBadge and WaveformDivider

**Files:**
- Create: `components/community/ProBadge.tsx`
- Create: `components/community/WaveformDivider.tsx`

- [ ] **Step 1: Create ProBadge**

Create `components/community/ProBadge.tsx`:

```typescript
export default function ProBadge() {
  return (
    <div
      title="PRO"
      style={{
        width: 28,
        height: 14,
        flexShrink: 0,
        backgroundColor: "#f59e0b",
        WebkitMaskImage: "url(/fennec-logo.png)",
        maskImage: "url(/fennec-logo.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
```

- [ ] **Step 2: Create WaveformDivider**

Create `components/community/WaveformDivider.tsx`:

```typescript
// Heights for each bar — pre-generated for visual variety
const BARS = [4,10,6,14,8,4,12,6,14,8,4,10,14,6,10,4,14,8,6,12,4,10,14,6,8,4,12,14,6,10,4,8,14,6,10,4,12,8,14,6,4,10,14,8,6,12,4,10,6,14,8,4,12,6,14];

type Props = { hasAudio?: boolean };

export default function WaveformDivider({ hasAudio = false }: Props) {
  const color = hasAudio ? "#f59e0b" : "#52525b";
  const maxOpacity = hasAudio ? 0.8 : 0.35;

  return (
    <svg
      viewBox={`0 0 ${BARS.length * 5} 16`}
      xmlns="http://www.w3.org/2000/svg"
      className="w-full"
      style={{ height: 14 }}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`wf-${hasAudio ? "a" : "g"}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor={color} stopOpacity={0} />
          <stop offset="25%"  stopColor={color} stopOpacity={maxOpacity * 0.6} />
          <stop offset="50%"  stopColor={color} stopOpacity={maxOpacity} />
          <stop offset="75%"  stopColor={color} stopOpacity={maxOpacity * 0.6} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {BARS.map((h, i) => (
        <rect
          key={i}
          x={i * 5 + 1}
          y={(16 - h) / 2}
          width={2}
          height={h}
          rx={1}
          fill={`url(#wf-${hasAudio ? "a" : "g"})`}
        />
      ))}
    </svg>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/community/ProBadge.tsx components/community/WaveformDivider.tsx
git commit -m "feat: ProBadge and WaveformDivider components"
```

---

### Task 9: AudioPlayerInline and VideoEmbed

**Files:**
- Create: `components/community/AudioPlayerInline.tsx`
- Create: `components/community/VideoEmbed.tsx`

- [ ] **Step 1: Create AudioPlayerInline**

Create `components/community/AudioPlayerInline.tsx`:

```typescript
"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";

type Props = { url: string; name: string };

export default function AudioPlayerInline({ url, name }: Props) {
  const audioRef              = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setProgress(audio.currentTime / (audio.duration || 1));
    audio.onended = () => { setPlaying(false); setProgress(0); };
    return () => { audio.pause(); audio.src = ""; };
  }, [url]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else { audio.play(); setPlaying(true); }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 px-3 py-2.5">
      <button
        onClick={toggle}
        className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 hover:bg-accent/80 transition"
      >
        {playing
          ? <Pause className="h-3.5 w-3.5 text-black" />
          : <Play className="h-3.5 w-3.5 text-black ml-0.5" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-zinc-300 truncate mb-1.5">{name}</p>
        <div className="h-1.5 rounded-full bg-white/10">
          <div
            className="h-1.5 rounded-full bg-accent transition-all"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
      <span className="text-[10px] text-zinc-600 shrink-0">{fmt(duration)}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create VideoEmbed**

Create `components/community/VideoEmbed.tsx`:

```typescript
"use client";
import { useState } from "react";
import { Play } from "lucide-react";

type Props = { url: string; title?: string | null };

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
  return null;
}

function getThumbnailUrl(url: string): string | null {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
  return null;
}

export default function VideoEmbed({ url, title }: Props) {
  const [playing, setPlaying] = useState(false);
  const embedUrl = getEmbedUrl(url);
  const thumbnail = getThumbnailUrl(url);

  if (!embedUrl) return null;

  if (playing) {
    return (
      <div className="relative rounded-xl overflow-hidden aspect-video w-full">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setPlaying(true)}
      className="relative w-full rounded-xl overflow-hidden aspect-video bg-zinc-900 flex items-center justify-center group"
    >
      {thumbnail && (
        <img src={thumbnail} alt={title ?? "Video"} className="absolute inset-0 w-full h-full object-cover opacity-70" />
      )}
      <div className="relative z-10 w-12 h-12 rounded-full bg-accent flex items-center justify-center group-hover:scale-110 transition">
        <Play className="h-5 w-5 text-black ml-0.5" />
      </div>
      {title && (
        <p className="absolute bottom-2 left-3 right-3 text-xs text-white font-medium truncate z-10 drop-shadow">{title}</p>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/community/AudioPlayerInline.tsx components/community/VideoEmbed.tsx
git commit -m "feat: AudioPlayerInline and VideoEmbed components"
```

---

### Task 10: PostCard

**Files:**
- Create: `components/community/PostCard.tsx`

- [ ] **Step 1: Create PostCard**

Create `components/community/PostCard.tsx`:

```typescript
"use client";
import { useState } from "react";
import { MessageCircle, Repeat2, Bookmark, BookmarkCheck } from "lucide-react";
import { toggleVibe, toggleBookmark } from "@/lib/communityDb";
import type { Post, Profile } from "@/lib/communityTypes";
import ProBadge from "./ProBadge";
import WaveformDivider from "./WaveformDivider";
import AudioPlayerInline from "./AudioPlayerInline";
import VideoEmbed from "./VideoEmbed";

type Props = {
  post: Post;
  currentProfile: Profile | null;
  onOpenThread: (post: Post) => void;
  onLoop: (post: Post) => void;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24)  return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function avatarInitial(p: Profile) {
  return (p.username[0] ?? "?").toUpperCase();
}

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PostCard({ post, currentProfile, onOpenThread, onLoop }: Props) {
  const [vibed, setVibed]           = useState(post.user_vibed);
  const [vibeCount, setVibeCount]   = useState(post.vibe_count);
  const [bookmarked, setBookmarked] = useState(post.user_bookmarked);

  const hasAudio = post.media_type === "audio";
  const hasImage = post.media_type === "image";
  const hasGif   = post.media_type === "gif";
  const hasVideo = post.media_type === "video-embed";

  async function handleVibe() {
    if (!currentProfile) return;
    const next = !vibed;
    setVibed(next);
    setVibeCount((c) => c + (next ? 1 : -1));
    await toggleVibe(post.id, currentProfile.id, vibed);
  }

  async function handleBookmark() {
    if (!currentProfile) return;
    const next = !bookmarked;
    setBookmarked(next);
    await toggleBookmark(post.id, currentProfile.id, bookmarked);
  }

  const p = post.profile;

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] overflow-hidden">

      {/* Category + time */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[10px] text-zinc-500 bg-white/5 px-2.5 py-1 rounded-full">
          {post.category === "music"    && "🎵 Music"}
          {post.category === "gear"     && "🎛️ Gear & Tools"}
          {post.category === "sync"     && "🎬 Sync & Scoring"}
          {post.category === "business" && "💼 Business"}
          {post.category === "mindset"  && "🧠 Mindset"}
          {post.category === "general"  && "💬 General"}
        </span>
        <span className="text-[10px] text-zinc-600">{timeAgo(post.created_at)}</span>
      </div>

      {/* Content */}
      <div className="px-4 pb-3 space-y-2.5">
        {post.content && (
          <p className="text-sm text-zinc-300 leading-relaxed">{post.content}</p>
        )}

        {/* Media */}
        {hasAudio && post.media_url && (
          <AudioPlayerInline url={post.media_url} name={post.media_name ?? "Audio"} />
        )}
        {(hasImage || hasGif) && post.media_url && (
          <img
            src={post.media_url}
            alt=""
            className="w-full rounded-xl object-cover max-h-72"
          />
        )}
        {hasVideo && post.link_url && (
          <VideoEmbed url={post.link_url} title={post.link_title} />
        )}
        {post.media_type === "link" && post.link_url && (
          <a
            href={post.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-zinc-400 hover:text-white transition"
          >
            <span className="truncate">{post.link_title ?? post.link_url}</span>
          </a>
        )}
      </div>

      {/* Waveform divider */}
      <div className="px-4">
        <WaveformDivider hasAudio={hasAudio || hasVideo} />
      </div>

      {/* User info — centered */}
      <div className="flex items-center justify-center gap-2 px-4 py-2.5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
          style={{ backgroundColor: avatarColor(p.username) }}
        >
          {p.avatar_url
            ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            : avatarInitial(p)}
        </div>
        <span className="text-sm font-semibold text-zinc-200">@{p.username}</span>
        {p.is_pro && <ProBadge />}
        <span className="text-xs text-zinc-600">{p.fennec_db_score} dB</span>
      </div>

      {/* Action bar */}
      <div className="border-t border-white/5 flex items-center justify-around px-4 py-2.5">
        <button
          onClick={handleVibe}
          className={`flex items-center gap-1.5 text-xs transition ${vibed ? "text-accent" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <span>🎵</span>
          <span>{vibeCount > 0 ? vibeCount : ""}</span>
        </button>

        <button
          onClick={() => onOpenThread(post)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          <MessageCircle className="h-4 w-4" />
          <span>{post.comment_count > 0 ? post.comment_count : ""}</span>
        </button>

        <button
          onClick={() => onLoop(post)}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition"
        >
          <Repeat2 className="h-4 w-4" />
          <span>{post.repost_of ? "Loop" : ""}</span>
        </button>

        <button
          onClick={handleBookmark}
          className={`transition ${bookmarked ? "text-accent" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          {bookmarked
            ? <BookmarkCheck className="h-4 w-4" />
            : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/community/PostCard.tsx
git commit -m "feat: PostCard with all media types, Vibe, Loop, Save"
```

---

### Task 11: FeedView

**Files:**
- Create: `components/community/FeedView.tsx`

- [ ] **Step 1: Create FeedView**

Create `components/community/FeedView.tsx`:

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { Pencil } from "lucide-react";
import { fetchPosts, createPost } from "@/lib/communityDb";
import type { Post, Profile, PostCategory } from "@/lib/communityTypes";
import { CATEGORIES } from "@/lib/communityTypes";
import PostCard from "./PostCard";
import ComposerSheet from "./ComposerSheet";

type Props = {
  profile: Profile;
  onOpenThread: (post: Post) => void;
};

export default function FeedView({ profile, onOpenThread }: Props) {
  const [category, setCategory]     = useState<PostCategory | null>(null);
  const [posts, setPosts]           = useState<Post[]>([]);
  const [page, setPage]             = useState(0);
  const [loading, setLoading]       = useState(true);
  const [hasMore, setHasMore]       = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);

  const loadPosts = useCallback(async (cat: PostCategory | null, p: number, reset: boolean) => {
    setLoading(true);
    try {
      const data = await fetchPosts(cat, p, profile.id);
      setPosts((prev) => reset ? data : [...prev, ...data]);
      setHasMore(data.length === 20);
    } finally {
      setLoading(false);
    }
  }, [profile.id]);

  useEffect(() => {
    setPage(0);
    loadPosts(category, 0, true);
  }, [category, loadPosts]);

  function handleCategoryChange(cat: PostCategory | null) {
    setCategory(cat);
  }

  async function handleLoop(post: Post) {
    await createPost({
      userId: profile.id,
      content: post.content,
      category: post.category,
      repostOf: post.id,
    });
    loadPosts(category, 0, true);
  }

  function handlePostCreated(post: Post) {
    setPosts((prev) => [post, ...prev]);
    setComposerOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-2 pb-24">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Community</p>
          <h1 className="text-2xl font-bold text-white">Feed</h1>
        </div>
        <button
          onClick={() => setComposerOpen(true)}
          className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center hover:bg-accent/80 transition"
        >
          <Pencil className="h-4 w-4 text-black" />
        </button>
      </div>

      {/* Category chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
        <button
          onClick={() => handleCategoryChange(null)}
          className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
            category === null ? "bg-accent text-black" : "bg-white/5 text-zinc-400 hover:text-white"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition ${
              category === cat.id ? "bg-accent text-black" : "bg-white/5 text-zinc-400 hover:text-white"
            }`}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-3">
        {loading && posts.length === 0 && (
          [...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-white/[0.03] h-40 animate-pulse" />
          ))
        )}

        {!loading && posts.length === 0 && (
          <div className="text-center py-16 text-zinc-600 text-sm">
            No hay posts todavía. ¡Sé el primero! ✍️
          </div>
        )}

        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentProfile={profile}
            onOpenThread={onOpenThread}
            onLoop={handleLoop}
          />
        ))}

        {hasMore && posts.length > 0 && (
          <button
            onClick={() => { const next = page + 1; setPage(next); loadPosts(category, next, false); }}
            className="w-full py-3 text-xs text-zinc-600 hover:text-zinc-400 transition"
          >
            {loading ? "Cargando..." : "Ver más"}
          </button>
        )}
      </div>

      {/* Composer */}
      {composerOpen && (
        <ComposerSheet
          profile={profile}
          onClose={() => setComposerOpen(false)}
          onPostCreated={handlePostCreated}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify feed loads (with empty state)**

Open Community tab while logged in.
Expected: header + category chips + empty state "No hay posts todavía" + no console errors.

- [ ] **Step 3: Commit**

```bash
git add components/community/FeedView.tsx
git commit -m "feat: FeedView with category chips, pagination, and post list"
```

---

## Phase 4 — Post Creation

### Task 12: GifPicker

**Files:**
- Create: `components/community/GifPicker.tsx`

- [ ] **Step 1: Create GifPicker**

Create `components/community/GifPicker.tsx`:

```typescript
"use client";
import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";

type GifResult = { id: string; url: string; preview: string };

type Props = {
  onSelect: (url: string) => void;
  onClose: () => void;
};

export default function GifPicker({ onSelect, onClose }: Props) {
  const [query, setQuery]   = useState("");
  const [gifs, setGifs]     = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchGifs(q: string) {
    setLoading(true);
    const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
    const endpoint = q.trim()
      ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(q)}&limit=20&rating=g`
      : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=20&rating=g`;
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs((data.data ?? []).map((g: { id: string; images: { fixed_height_small: { url: string }; preview_gif: { url: string } } }) => ({
        id: g.id,
        url: g.images.fixed_height_small.url,
        preview: g.images.preview_gif.url,
      })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchGifs(""); }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchGifs(query), 400);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-3"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">GIFs</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar GIFs..."
            className="w-full h-10 rounded-xl border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div
          className="grid grid-cols-3 gap-2 overflow-y-auto"
          style={{ maxHeight: "50vh" }}
        >
          {loading && [...Array(9)].map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-white/5 animate-pulse" />
          ))}
          {!loading && gifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => { onSelect(gif.url); onClose(); }}
              className="aspect-square rounded-xl overflow-hidden hover:ring-2 hover:ring-accent transition"
            >
              <img src={gif.preview} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/community/GifPicker.tsx
git commit -m "feat: GifPicker with GIPHY search and trending"
```

---

### Task 13: MelodyPicker

**Files:**
- Create: `components/community/MelodyPicker.tsx`

- [ ] **Step 1: Create MelodyPicker**

Create `components/community/MelodyPicker.tsx`:

```typescript
"use client";
import { useEffect, useState } from "react";
import { X, Music2, Play } from "lucide-react";
import { openDB } from "idb";
import { uploadAudio } from "@/lib/communityDb";

type Recording = { id: string; title: string; blob: Blob; duration: number; createdAt: number };

type Props = {
  onSelect: (url: string, name: string) => void;
  onClose: () => void;
};

async function loadRecordings(): Promise<Recording[]> {
  const db = await openDB("fennec-ideas-db", 2);
  if (!db.objectStoreNames.contains("recordings")) return [];
  return db.getAll("recordings");
}

export default function MelodyPicker({ onSelect, onClose }: Props) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [uploading, setUploading]   = useState<string | null>(null);

  useEffect(() => {
    loadRecordings().then((r) => setRecordings(r.sort((a, b) => b.createdAt - a.createdAt)));
  }, []);

  async function handleSelect(rec: Recording) {
    setUploading(rec.id);
    try {
      const url = await uploadAudio(rec.blob, `${rec.title}.webm`);
      onSelect(url, rec.title);
      onClose();
    } catch (err) {
      console.error("Upload failed", err);
      alert("Error subiendo el audio. Intenta de nuevo.");
    } finally {
      setUploading(null);
    }
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60" onClick={onClose}>
      <div
        className="w-full rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-3"
        style={{ maxHeight: "70vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Melody Bank</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        {recordings.length === 0 && (
          <p className="text-sm text-zinc-600 text-center py-8">
            No tienes grabaciones en tu Melody Bank todavía.
          </p>
        )}

        <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "55vh" }}>
          {recordings.map((rec) => (
            <button
              key={rec.id}
              onClick={() => handleSelect(rec)}
              disabled={!!uploading}
              className="w-full flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06] transition disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                {uploading === rec.id
                  ? <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                  : <Play className="h-4 w-4 text-accent" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{rec.title}</p>
                <p className="text-xs text-zinc-600">{fmt(rec.duration)}</p>
              </div>
              <Music2 className="h-4 w-4 text-zinc-700 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/community/MelodyPicker.tsx
git commit -m "feat: MelodyPicker reads from IndexedDB and uploads to Supabase Storage"
```

---

### Task 14: ComposerSheet

**Files:**
- Create: `components/community/ComposerSheet.tsx`

- [ ] **Step 1: Create ComposerSheet**

Create `components/community/ComposerSheet.tsx`:

```typescript
"use client";
import { useState, useRef } from "react";
import { X, Music2, ImageIcon, Link2, SmilePlus } from "lucide-react";
import { createPost, uploadImage } from "@/lib/communityDb";
import type { Profile, Post, PostCategory, MediaType } from "@/lib/communityTypes";
import { CATEGORIES } from "@/lib/communityTypes";
import MelodyPicker from "./MelodyPicker";
import GifPicker from "./GifPicker";

type Props = {
  profile: Profile;
  onClose: () => void;
  onPostCreated: (post: Post) => void;
};

const YOUTUBE_RE = /(?:youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/;
const VIMEO_RE   = /vimeo\.com\/\d+/;

function detectVideo(text: string): string | null {
  const words = text.split(/\s+/);
  for (const w of words) {
    if (YOUTUBE_RE.test(w) || VIMEO_RE.test(w)) return w;
  }
  return null;
}

export default function ComposerSheet({ profile, onClose, onPostCreated }: Props) {
  const [content, setContent]       = useState("");
  const [category, setCategory]     = useState<PostCategory>("general");
  const [mediaUrl, setMediaUrl]     = useState<string | null>(null);
  const [mediaType, setMediaType]   = useState<MediaType>(null);
  const [mediaName, setMediaName]   = useState<string | null>(null);
  const [linkUrl, setLinkUrl]       = useState<string | null>(null);
  const [linkTitle, setLinkTitle]   = useState<string | null>(null);
  const [showMelody, setShowMelody] = useState(false);
  const [showGif, setShowGif]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canPost = content.trim().length > 0 || mediaUrl;

  function handleContentChange(val: string) {
    setContent(val);
    // Auto-detect YouTube/Vimeo
    const vid = detectVideo(val);
    if (vid && mediaType !== "video-embed") {
      setLinkUrl(vid);
      setMediaType("video-embed");
    } else if (!vid && mediaType === "video-embed") {
      setLinkUrl(null);
      setMediaType(null);
    }
  }

  function clearMedia() {
    setMediaUrl(null);
    setMediaType(null);
    setMediaName(null);
    setLinkUrl(null);
    setLinkTitle(null);
  }

  async function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    try {
      const url = await uploadImage(file);
      setMediaUrl(url);
      setMediaType("image");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    if (!canPost) return;
    setSubmitting(true);
    try {
      const post = await createPost({
        userId:    profile.id,
        content:   content.trim(),
        category,
        mediaUrl:  mediaUrl ?? undefined,
        mediaType: mediaType ?? undefined,
        mediaName: mediaName ?? undefined,
        linkUrl:   linkUrl ?? undefined,
        linkTitle: linkTitle ?? undefined,
      });
      onPostCreated(post);
    } catch (err) {
      console.error(err);
      alert("Error publicando. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Nuevo post</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        {/* Category selector */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                category === cat.id ? "bg-accent text-black" : "bg-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Text input */}
        <textarea
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          placeholder="¿Qué está pasando en tu estudio?"
          maxLength={500}
          rows={3}
          autoFocus
          className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-accent resize-none"
        />

        {/* Media preview */}
        {mediaUrl && (
          <div className="relative">
            {mediaType === "image" && (
              <img src={mediaUrl} className="w-full max-h-40 rounded-xl object-cover" alt="" />
            )}
            {mediaType === "gif" && (
              <img src={mediaUrl} className="w-full max-h-40 rounded-xl object-cover" alt="" />
            )}
            {mediaType === "audio" && (
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
                <Music2 className="h-4 w-4 text-accent" />
                <span className="truncate">{mediaName}</span>
              </div>
            )}
            <button
              onClick={clearMedia}
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center"
            >
              <X className="h-3.5 w-3.5 text-white" />
            </button>
          </div>
        )}

        {mediaType === "video-embed" && linkUrl && (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-zinc-400">
            <span>▶</span>
            <span className="truncate">{linkUrl}</span>
            <button onClick={clearMedia}><X className="h-3.5 w-3.5" /></button>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowMelody(true)}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title="Adjuntar audio del Melody Bank"
            >
              <Music2 className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title="Adjuntar imagen"
            >
              <ImageIcon className="h-4 w-4 text-zinc-400" />
            </button>
            <button
              onClick={() => setShowGif(true)}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
              title="Adjuntar GIF"
            >
              <SmilePlus className="h-4 w-4 text-zinc-400" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canPost || submitting}
            className="px-5 h-9 rounded-xl bg-accent text-black text-sm font-semibold hover:bg-accent/80 transition disabled:opacity-40"
          >
            {submitting ? "..." : "Publicar"}
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
      </div>

      {showMelody && (
        <MelodyPicker
          onSelect={(url, name) => { setMediaUrl(url); setMediaType("audio"); setMediaName(name); }}
          onClose={() => setShowMelody(false)}
        />
      )}
      {showGif && (
        <GifPicker
          onSelect={(url) => { setMediaUrl(url); setMediaType("gif"); }}
          onClose={() => setShowGif(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Test full post creation flow**

1. Open feed → tap ✍️ button
2. Select category → write text → tap "Publicar"
3. Expected: post appears at top of feed with correct category chip

- [ ] **Step 3: Test audio attachment**

1. Open composer → tap 🎵 icon
2. Expected: MelodyPicker shows list from Melody Bank
3. Select a recording → uploading spinner → audio player appears in preview
4. Publish → post shows audio player in feed

- [ ] **Step 4: Test image attachment**

1. Open composer → tap image icon → select a photo
2. Expected: image preview appears → publish → post shows image in feed

- [ ] **Step 5: Test YouTube auto-detection**

1. Paste `https://www.youtube.com/watch?v=dQw4w9WgXcQ` in the text field
2. Expected: video URL chip appears automatically (no button needed)
3. Publish → post shows YouTube thumbnail with play button

- [ ] **Step 6: Commit**

```bash
git add components/community/ComposerSheet.tsx
git commit -m "feat: ComposerSheet with text, audio, image, GIF and YouTube embed"
```

---

## Phase 5 — Comment Threads

### Task 15: CommentsView

**Files:**
- Create: `components/community/CommentsView.tsx`

- [ ] **Step 1: Create CommentsView**

Create `components/community/CommentsView.tsx`:

```typescript
"use client";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, SmilePlus, Send } from "lucide-react";
import { fetchComments, createComment, toggleVibe } from "@/lib/communityDb";
import type { Post, Comment, Profile } from "@/lib/communityTypes";
import PostCard from "./PostCard";
import GifPicker from "./GifPicker";

type Props = {
  post: Post;
  profile: Profile;
  onBack: () => void;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)  return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24)     return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function CommentsView({ post, profile, onBack }: Props) {
  const [comments, setComments]     = useState<Comment[]>([]);
  const [loading, setLoading]       = useState(true);
  const [text, setText]             = useState("");
  const [gifUrl, setGifUrl]         = useState<string | null>(null);
  const [showGif, setShowGif]       = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments(post.id, profile.id)
      .then(setComments)
      .finally(() => setLoading(false));
  }, [post.id, profile.id]);

  async function handleSend() {
    if (!text.trim() && !gifUrl) return;
    setSubmitting(true);
    try {
      const comment = await createComment(post.id, profile.id, text.trim(), gifUrl ?? undefined);
      setComments((prev) => [...prev, comment]);
      setText("");
      setGifUrl(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVibeComment(comment: Comment) {
    await toggleVibe(comment.id, profile.id, comment.user_vibed);
    setComments((prev) =>
      prev.map((c) =>
        c.id === comment.id
          ? { ...c, user_vibed: !c.user_vibed, vibe_count: c.vibe_count + (c.user_vibed ? -1 : 1) }
          : c
      )
    );
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/8">
        <button onClick={onBack} className="text-zinc-400 hover:text-white transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-white">Thread</span>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

        {/* Original post */}
        <PostCard
          post={post}
          currentProfile={profile}
          onOpenThread={() => {}}
          onLoop={() => {}}
        />

        {/* Comment count */}
        {!loading && (
          <p className="text-xs text-zinc-600 px-1">
            {comments.length === 0 ? "Sin comentarios todavía" : `${comments.length} comentario${comments.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && [...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
            </div>
          </div>
        ))}

        {/* Comments */}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ backgroundColor: avatarColor(comment.profile.username) }}
            >
              {comment.profile.avatar_url
                ? <img src={comment.profile.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                : comment.profile.username[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-zinc-300">@{comment.profile.username}</span>
                <span className="text-[10px] text-zinc-600">{timeAgo(comment.created_at)}</span>
              </div>
              {comment.content && (
                <p className="text-sm text-zinc-400 leading-relaxed">{comment.content}</p>
              )}
              {comment.gif_url && (
                <img src={comment.gif_url} alt="" className="mt-1.5 max-h-32 rounded-xl" />
              )}
              <button
                onClick={() => handleVibeComment(comment)}
                className={`mt-1.5 flex items-center gap-1 text-[11px] transition ${
                  comment.user_vibed ? "text-accent" : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                <span>🎵</span>
                {comment.vibe_count > 0 && <span>{comment.vibe_count}</span>}
              </button>
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* Comment input */}
      <div className="border-t border-white/8 px-3 py-3 space-y-2">
        {gifUrl && (
          <div className="relative inline-block">
            <img src={gifUrl} alt="" className="h-16 rounded-xl" />
            <button
              onClick={() => setGifUrl(null)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black border border-white/20 flex items-center justify-center text-[10px] text-white"
            >✕</button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ backgroundColor: avatarColor(profile.username) }}
          >
            {profile.username[0]?.toUpperCase()}
          </div>
          <div className="flex-1 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Escribe un comentario..."
              className="flex-1 text-sm text-white placeholder:text-zinc-600 bg-transparent outline-none"
            />
            <button onClick={() => setShowGif(true)}>
              <SmilePlus className="h-4 w-4 text-zinc-500 hover:text-zinc-300 transition" />
            </button>
          </div>
          <button
            onClick={handleSend}
            disabled={(!text.trim() && !gifUrl) || submitting}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center disabled:opacity-40 hover:bg-accent/80 transition"
          >
            <Send className="h-4 w-4 text-black" />
          </button>
        </div>
      </div>

      {showGif && (
        <GifPicker
          onSelect={(url) => setGifUrl(url)}
          onClose={() => setShowGif(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Test comment thread flow**

1. Tap any post's comment icon (💬)
2. Expected: CommentsView opens with original post at top
3. Type a comment → Send
4. Expected: comment appears below with your username
5. Tap 🎵 on a comment → vibe count increases
6. Tap GIF icon → GIPHY picker opens → select GIF → GIF appears in input preview → Send → GIF renders in thread

- [ ] **Step 3: Commit**

```bash
git add components/community/CommentsView.tsx
git commit -m "feat: CommentsView thread with comments, vibes, and GIF support"
```

---

### Task 16: Final wiring and smoke test

**Files:**
- No new files — verify everything connects

- [ ] **Step 1: Full user flow smoke test**

Test this sequence end-to-end:

1. ✅ Open app → Community tab → see AuthGate
2. ✅ Sign in with Google → redirected back
3. ✅ First login → UsernameSetup → choose username → enter feed
4. ✅ Feed shows "All" + 6 category chips
5. ✅ Tap ✍️ → ComposerSheet opens
6. ✅ Write text + select 🎵 Music → tap Publicar → post appears in feed
7. ✅ Post shows: category chip · text · waveform divider · @username · dB score
8. ✅ Tap 🎵 Vibe → count increments, turns amber
9. ✅ Tap 🔖 bookmark → icon fills
10. ✅ Tap 🔁 Loop → repost created at top of feed
11. ✅ Tap comment icon → CommentsView opens → write comment → appears
12. ✅ Paste YouTube link in composer → video chip appears → post → thumbnail + play button in feed → tap → plays inline

- [ ] **Step 2: Verify Supabase data in Table Editor**

Open Supabase Dashboard → Table Editor:
- `profiles` — your profile row with username, is_pro, fennec_db_score
- `posts` — your test posts with correct category and media_type
- `vibes` — rows for the posts you vibed
- `comments` — your test comments

- [ ] **Step 3: Final commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add -A
git commit -m "feat: Fennec Community Feed complete — auth, feed, posts, interactions, threads"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in task |
|-----------------|----------------|
| Google OAuth + email/password auth | Task 5, 7 |
| Username setup on first login | Task 6, 7 |
| Global feed + filter chips | Task 11 |
| 6 categories | Task 4 (types) + Task 11 |
| Post card: content-first layout | Task 10 |
| Waveform divider (amber/gray) | Task 8 |
| PRO badge (Fennec logo amber) | Task 8 |
| Fennec dB shown on posts | Task 10 |
| Vibe (like) | Task 10 |
| Loop (repost) | Task 10, 11 |
| Save/bookmark | Task 10 |
| Audio posts (Melody Bank) | Task 9, 13, 14 |
| Image posts | Task 14 |
| GIF posts via GIPHY | Task 12, 14 |
| YouTube/Vimeo embed detection | Task 9, 14 |
| Comment threads (flat, Twitter-style) | Task 15 |
| Vibe on comments | Task 15 |
| GIFs in comments | Task 15 |
| Fennec dB sync to Supabase | Task 7 |
| Pagination (load more) | Task 11 |
