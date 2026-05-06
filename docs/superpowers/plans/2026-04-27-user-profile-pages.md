# User Profile Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public user profile pages accessible from the feed, showing avatar, @username, Fennec dB score, bio, genre tags, "Worked with" and "Worked in" credits, and the user's posts.

**Architecture:** Profile data is extended with new columns in Supabase (`bio`, `genres`, `worked_with`, `worked_in`). Navigation is managed in `CommunityPanel` in `Community.tsx` via a `view` state (`feed | thread | profile`). Clicking any avatar/username in the feed or comments opens the `UserProfilePage`, which also shows an Edit button when viewing your own profile.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase (PostgreSQL + Storage)

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `lib/communityTypes.ts` | Modify | Add `bio`, `genres`, `worked_with`, `worked_in` to `Profile` type |
| `lib/communityDb.ts` | Modify | Add `updateProfile`, `fetchUserPosts` functions |
| `components/community/UserProfilePage.tsx` | Create | Full profile view (avatar, bio, genres, credits, posts) |
| `components/community/EditProfileSheet.tsx` | Create | Bottom sheet to edit bio, genres, worked_with, worked_in, avatar |
| `components/community/PostCard.tsx` | Modify | Add `onOpenProfile` prop, make avatar/username tappable |
| `components/community/FeedView.tsx` | Modify | Add `onOpenProfile` prop, pass to PostCard |
| `components/community/CommentsView.tsx` | Modify | Add `onOpenProfile` prop, pass to PostCard |
| `components/community/Community.tsx` | Modify | Add `profile` view state to `CommunityPanel`, render `UserProfilePage` |

---

### Task 1: Supabase migration + extend Profile type

**Files:**
- Modify: `lib/communityTypes.ts`

- [ ] **Step 1: Run this SQL in the Supabase SQL editor**

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS genres text[] DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS worked_with text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS worked_in text;
```

- [ ] **Step 2: Update `lib/communityTypes.ts` — add fields to Profile**

Replace the existing `Profile` type with:

```typescript
export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
  fennec_db_score: number;
  created_at: string;
  // Extended profile fields
  bio: string | null;
  genres: string[];
  worked_with: string | null;
  worked_in: string | null;
};
```

- [ ] **Step 3: Verify the app compiles without errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors (or only pre-existing errors unrelated to Profile).

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add lib/communityTypes.ts
git commit -m "feat: extend Profile type with bio, genres, worked_with, worked_in"
```

---

### Task 2: Add `updateProfile` and `fetchUserPosts` to communityDb

**Files:**
- Modify: `lib/communityDb.ts`

- [ ] **Step 1: Add `updateProfile` function** — append after `isUsernameTaken`:

```typescript
export async function updateProfile(userId: string, updates: {
  bio?: string | null;
  genres?: string[];
  worked_with?: string | null;
  worked_in?: string | null;
  avatar_url?: string | null;
}): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
```

- [ ] **Step 2: Add `fetchUserPosts` function** — append after `createPost`:

```typescript
export async function fetchUserPosts(userId: string, currentUserId: string | null): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profile:profiles!posts_user_id_fkey(*),
      vibe_count:vibes(count),
      comment_count:comments(count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;

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
```

- [ ] **Step 3: Add `fetchUserPosts` to the import in the file header** (it's a local function, no import needed — just verify the file compiles):

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add lib/communityDb.ts
git commit -m "feat: add updateProfile and fetchUserPosts to communityDb"
```

---

### Task 3: Create `EditProfileSheet` component

**Files:**
- Create: `components/community/EditProfileSheet.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";
import { useState, useRef } from "react";
import { X, Plus } from "lucide-react";
import { updateProfile, uploadImage } from "@/lib/communityDb";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  profile: Profile;
  onClose: () => void;
  onSaved: (updated: Profile) => void;
};

export default function EditProfileSheet({ profile, onClose, onSaved }: Props) {
  const [bio, setBio]               = useState(profile.bio ?? "");
  const [genreInput, setGenreInput] = useState("");
  const [genres, setGenres]         = useState<string[]>(profile.genres ?? []);
  const [workedWith, setWorkedWith] = useState(profile.worked_with ?? "");
  const [workedIn, setWorkedIn]     = useState(profile.worked_in ?? "");
  const [saving, setSaving]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addGenre() {
    const tag = genreInput.trim();
    if (!tag || genres.includes(tag)) { setGenreInput(""); return; }
    setGenres((g) => [...g, tag]);
    setGenreInput("");
  }

  function removeGenre(tag: string) {
    setGenres((g) => g.filter((t) => t !== tag));
  }

  async function handleAvatarSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    try {
      const url = await uploadImage(file);
      const updated = await updateProfile(profile.id, { avatar_url: url });
      onSaved(updated);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await updateProfile(profile.id, {
        bio:        bio.trim() || null,
        genres,
        worked_with: workedWith.trim() || null,
        worked_in:   workedIn.trim() || null,
      });
      onSaved(updated);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Error guardando. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-zinc-950 border-t border-white/10 p-4 space-y-4 max-h-[85vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Editar perfil</span>
          <button onClick={onClose}><X className="h-5 w-5 text-zinc-500" /></button>
        </div>

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden hover:border-amber-500 transition"
          >
            {profile.avatar_url
              ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
              : <span className="text-xl font-bold text-zinc-400">{profile.username[0]?.toUpperCase()}</span>}
          </button>
          <div>
            <p className="text-sm font-semibold text-white">@{profile.username}</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              Cambiar foto
            </button>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Cuéntanos sobre ti..."
            maxLength={160}
            rows={3}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500 resize-none"
          />
          <p className="text-right text-[10px] text-zinc-600">{bio.length}/160</p>
        </div>

        {/* Genres */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Géneros</label>
          <div className="flex flex-wrap gap-1.5">
            {genres.map((tag) => (
              <button
                key={tag}
                onClick={() => removeGenre(tag)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 text-xs font-medium"
              >
                {tag} <X className="h-2.5 w-2.5" />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={genreInput}
              onChange={(e) => setGenreInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addGenre(); } }}
              placeholder="Ej: Dark Trap, Neoclassical..."
              className="flex-1 h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
            />
            <button
              onClick={addGenre}
              className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition"
            >
              <Plus className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
        </div>

        {/* Worked with */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Worked with</label>
          <input
            value={workedWith}
            onChange={(e) => setWorkedWith(e.target.value)}
            placeholder="Ej: Bad Bunny, Hans Zimmer, Sony Music"
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
          />
        </div>

        {/* Worked in */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Worked in</label>
          <input
            value={workedIn}
            onChange={(e) => setWorkedIn(e.target.value)}
            placeholder="Ej: Succession, FIFA 25, Coca-Cola ad"
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-amber-500"
          />
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-11 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/community/EditProfileSheet.tsx
git commit -m "feat: add EditProfileSheet component"
```

---

### Task 4: Create `UserProfilePage` component

**Files:**
- Create: `components/community/UserProfilePage.tsx`

- [ ] **Step 1: Create the file**

```typescript
"use client";
import { useEffect, useState } from "react";
import { ChevronLeft, Pencil } from "lucide-react";
import { getProfile, fetchUserPosts } from "@/lib/communityDb";
import type { Profile, Post } from "@/lib/communityTypes";
import ProBadge from "./ProBadge";
import PostCard from "./PostCard";
import EditProfileSheet from "./EditProfileSheet";

const AVATAR_COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#3b82f6","#ec4899"];
function avatarColor(username: string) {
  let hash = 0;
  for (const c of username) hash = (hash * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

type Props = {
  userId: string;           // profile being viewed
  currentProfile: Profile;  // logged-in user
  onBack: () => void;
  onOpenThread: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
};

export default function UserProfilePage({ userId, currentProfile, onBack, onOpenThread, onOpenProfile }: Props) {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [posts, setPosts]       = useState<Post[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const isOwnProfile = userId === currentProfile.id;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [p, userPosts] = await Promise.all([
        getProfile(userId),
        fetchUserPosts(userId, currentProfile.id),
      ]);
      setProfile(p);
      setPosts(userPosts);
      setLoading(false);
    }
    load();
  }, [userId, currentProfile.id]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-2 pt-6 space-y-4">
        <div className="h-6 w-24 rounded-full bg-white/5 animate-pulse" />
        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="w-20 h-20 rounded-full bg-white/5 animate-pulse" />
          <div className="h-4 w-32 rounded-full bg-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-4xl px-2 pt-6 text-center text-zinc-500 text-sm">
        Usuario no encontrado.
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-2 pb-24 space-y-6">

      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition pt-2"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      {/* Profile header */}
      <div className="flex flex-col items-center gap-3 pt-2">
        {/* Avatar */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 overflow-hidden"
          style={{ backgroundColor: avatarColor(profile.username) }}
        >
          {profile.avatar_url
            ? <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            : profile.username[0]?.toUpperCase()}
        </div>

        {/* Name + badges */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">@{profile.username}</span>
          {profile.is_pro && <ProBadge />}
        </div>

        {/* dB score */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
          <span className="text-xs text-zinc-400">Fennec dB</span>
          <span className="text-sm font-bold text-amber-500">{profile.fennec_db_score}</span>
        </div>

        {/* Edit button — only own profile */}
        {isOwnProfile && (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 text-xs text-zinc-400 hover:text-white hover:border-white/20 transition"
          >
            <Pencil className="h-3 w-3" />
            Editar perfil
          </button>
        )}
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-sm text-zinc-300 leading-relaxed text-center px-4">{profile.bio}</p>
      )}

      {/* Genres */}
      {profile.genres && profile.genres.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {profile.genres.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Credits */}
      {(profile.worked_with || profile.worked_in) && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          {profile.worked_with && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Worked with</p>
              <p className="text-sm text-zinc-300">{profile.worked_with}</p>
            </div>
          )}
          {profile.worked_in && (
            <div className="space-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Worked in</p>
              <p className="text-sm text-zinc-300">{profile.worked_in}</p>
            </div>
          )}
        </div>
      )}

      {/* Divider */}
      <div className="h-px bg-white/10" />

      {/* Posts */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Posts</p>
        {posts.length === 0 && (
          <p className="text-center text-sm text-zinc-600 py-8">Sin posts todavía.</p>
        )}
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentProfile={currentProfile}
            onOpenThread={onOpenThread}
            onLoop={() => {}}
            onOpenProfile={onOpenProfile}
          />
        ))}
      </div>

      {/* Edit sheet */}
      {editOpen && (
        <EditProfileSheet
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSaved={(updated) => {
            setProfile(updated);
            // Also update currentProfile reference if viewing own profile
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: error about `onOpenProfile` prop not existing on PostCard yet — that's fine, we fix it in the next task.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/community/UserProfilePage.tsx
git commit -m "feat: add UserProfilePage component"
```

---

### Task 5: Update `PostCard` — add `onOpenProfile` prop

**Files:**
- Modify: `components/community/PostCard.tsx`

- [ ] **Step 1: Add `onOpenProfile` to the Props type** (line ~11):

```typescript
type Props = {
  post: Post;
  currentProfile: Profile | null;
  onOpenThread: (post: Post) => void;
  onLoop: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
};
```

- [ ] **Step 2: Destructure `onOpenProfile` in the function signature** (line ~38):

```typescript
export default function PostCard({ post, currentProfile, onOpenThread, onLoop, onOpenProfile }: Props) {
```

- [ ] **Step 3: Make the user info section tappable** — replace the existing user info `div` (around line 119):

```typescript
      {/* User info — centered, tappable */}
      <button
        onClick={() => onOpenProfile(post.user_id)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 hover:bg-white/5 transition"
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 overflow-hidden"
          style={{ backgroundColor: avatarColor(p.username) }}
        >
          {p.avatar_url
            ? <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            : avatarInitial(p)}
        </div>
        <span className="text-sm font-semibold text-zinc-200">@{p.username}</span>
        {p.is_pro && <ProBadge />}
        <span className="text-xs text-zinc-600">{p.fennec_db_score} dB</span>
      </button>
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors on FeedView and CommentsView about missing `onOpenProfile` — fixed in next tasks.

- [ ] **Step 5: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/community/PostCard.tsx
git commit -m "feat: make PostCard user info tappable to open profile"
```

---

### Task 6: Update `FeedView` and `CommentsView` — thread `onOpenProfile`

**Files:**
- Modify: `components/community/FeedView.tsx`
- Modify: `components/community/CommentsView.tsx`

- [ ] **Step 1: Update `FeedView` Props type** — add `onOpenProfile`:

In `components/community/FeedView.tsx`, change the Props type:
```typescript
type Props = {
  profile: Profile;
  onOpenThread: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
};
```

And the function signature:
```typescript
export default function FeedView({ profile, onOpenThread, onOpenProfile }: Props) {
```

And pass it to each `PostCard`:
```typescript
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            currentProfile={profile}
            onOpenThread={onOpenThread}
            onLoop={handleLoop}
            onOpenProfile={onOpenProfile}
          />
        ))}
```

- [ ] **Step 2: Update `CommentsView`** — open `components/community/CommentsView.tsx` and add `onOpenProfile` to its Props, pass it down to every `PostCard` rendered inside it (the original post at the top and each comment card if applicable). The exact lines will vary — search for all `<PostCard` usages in the file and add `onOpenProfile={onOpenProfile}` to each.

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: errors on Community.tsx about missing `onOpenProfile` on FeedView/CommentsView — fixed next.

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/community/FeedView.tsx components/community/CommentsView.tsx
git commit -m "feat: thread onOpenProfile through FeedView and CommentsView"
```

---

### Task 7: Wire up profile navigation in `Community.tsx`

**Files:**
- Modify: `components/community/Community.tsx`

- [ ] **Step 1: Add `UserProfilePage` import** at the top of the file:

```typescript
import UserProfilePage from "./UserProfilePage";
```

- [ ] **Step 2: Update `CommunityView` type** (line ~19):

```typescript
type CommunityView = "feed" | "thread" | "profile";
```

- [ ] **Step 3: Add `profileUserId` state to `CommunityPanel`** and handle the three views. Replace the existing `CommunityPanel` function:

```typescript
function CommunityPanel({ profile }: { profile: Profile }) {
  const [view, setView]               = useState<CommunityView>("feed");
  const [activePost, setActivePost]   = useState<Post | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  function openProfile(userId: string) {
    setProfileUserId(userId);
    setView("profile");
  }

  if (view === "profile" && profileUserId) {
    return (
      <UserProfilePage
        userId={profileUserId}
        currentProfile={profile}
        onBack={() => { setProfileUserId(null); setView("feed"); }}
        onOpenThread={(post) => { setActivePost(post); setView("thread"); }}
        onOpenProfile={openProfile}
      />
    );
  }

  if (view === "thread" && activePost) {
    return (
      <CommentsView
        post={activePost}
        profile={profile}
        onBack={() => { setActivePost(null); setView("feed"); }}
        onOpenProfile={openProfile}
      />
    );
  }

  return (
    <FeedView
      profile={profile}
      onOpenThread={(post) => { setActivePost(post); setView("thread"); }}
      onOpenProfile={openProfile}
    />
  );
}
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npx tsc --noEmit 2>&1 | head -20
```

Expected: clean (0 errors).

- [ ] **Step 5: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/community/Community.tsx
git commit -m "feat: add profile navigation to CommunityPanel"
```

---

### Task 8: Smoke test

- [ ] **Step 1: Start dev server**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec" && npm run dev
```

- [ ] **Step 2: Verify each flow manually**

1. Open app → log in → go to Community tab → Feed
2. Tap any avatar/username on a post → profile page loads with @username and dB score
3. If viewing your own profile → "Editar perfil" button is visible
4. Tap "Editar perfil" → sheet opens with bio, genres, worked with/in fields
5. Add a genre tag → press Enter or + → tag appears
6. Save → profile updates
7. Tap another user's profile → no Edit button shown
8. Tap Back → returns to feed

- [ ] **Step 3: Final commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add -A
git commit -m "feat: user profile pages — complete implementation"
```
