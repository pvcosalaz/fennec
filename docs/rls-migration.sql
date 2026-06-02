-- ============================================================
-- Fennec App — Enable RLS on all tables
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── 1. cached_content ────────────────────────────────────────
-- Server-side cache for news/trending. Anyone can read,
-- only service_role (via API routes) can write.
alter table if exists cached_content enable row level security;

drop policy if exists "anyone can read cache" on cached_content;
create policy "anyone can read cache"
  on cached_content for select
  using (true);

-- No insert/update/delete policies → only service_role can write

-- ── 2. bot_posted_urls ───────────────────────────────────────
-- Internal bot table. Only service_role access, no public policies.
alter table if exists bot_posted_urls enable row level security;

-- ── 3. business_projects ─────────────────────────────────────
alter table if exists business_projects enable row level security;

drop policy if exists "users own projects" on business_projects;
create policy "users own projects"
  on business_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. business_clients ──────────────────────────────────────
alter table if exists business_clients enable row level security;

drop policy if exists "users own clients" on business_clients;
create policy "users own clients"
  on business_clients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. business_quotes ───────────────────────────────────────
alter table if exists business_quotes enable row level security;

drop policy if exists "users own quotes" on business_quotes;
create policy "users own quotes"
  on business_quotes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. notifications ─────────────────────────────────────────
alter table if exists notifications enable row level security;

drop policy if exists "users read own notifications" on notifications;
create policy "users read own notifications"
  on notifications for select
  using (auth.uid() = user_id);

drop policy if exists "users update own notifications" on notifications;
create policy "users update own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- service_role inserts notifications (bypasses RLS by default)

-- ── 7. notification_preferences ──────────────────────────────
alter table if exists notification_preferences enable row level security;

drop policy if exists "users manage own prefs" on notification_preferences;
create policy "users manage own prefs"
  on notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 8. push_subscriptions ────────────────────────────────────
alter table if exists push_subscriptions enable row level security;

drop policy if exists "users manage own subscriptions" on push_subscriptions;
create policy "users manage own subscriptions"
  on push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 9. project_reviews ───────────────────────────────────────
alter table if exists project_reviews enable row level security;

drop policy if exists "users own project reviews" on project_reviews;
create policy "users own project reviews"
  on project_reviews for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 10. review_comments ──────────────────────────────────────
alter table if exists review_comments enable row level security;

drop policy if exists "users own review comments" on review_comments;
create policy "users own review comments"
  on review_comments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 11. profiles (community — may already exist) ─────────────
alter table if exists profiles enable row level security;

drop policy if exists "profiles are public" on profiles;
create policy "profiles are public"
  on profiles for select
  using (true);

drop policy if exists "users update own profile" on profiles;
create policy "users update own profile"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "users insert own profile" on profiles;
create policy "users insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

-- ── 13. posts ────────────────────────────────────────────────
alter table if exists posts enable row level security;

drop policy if exists "posts are public" on posts;
create policy "posts are public"
  on posts for select
  using (true);

drop policy if exists "users own posts" on posts;
create policy "users own posts"
  on posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own posts" on posts;
create policy "users delete own posts"
  on posts for delete
  using (auth.uid() = user_id);

-- ── 14. comments ─────────────────────────────────────────────
alter table if exists comments enable row level security;

drop policy if exists "comments are public" on comments;
create policy "comments are public"
  on comments for select
  using (true);

drop policy if exists "users own comments" on comments;
create policy "users own comments"
  on comments for insert
  with check (auth.uid() = user_id);

drop policy if exists "users delete own comments" on comments;
create policy "users delete own comments"
  on comments for delete
  using (auth.uid() = user_id);

-- ── 15. vibes ────────────────────────────────────────────────
alter table if exists vibes enable row level security;

drop policy if exists "vibes are public" on vibes;
create policy "vibes are public"
  on vibes for select
  using (true);

drop policy if exists "users manage own vibes" on vibes;
create policy "users manage own vibes"
  on vibes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 16. bookmarks ────────────────────────────────────────────
alter table if exists bookmarks enable row level security;

drop policy if exists "users own bookmarks" on bookmarks;
create policy "users own bookmarks"
  on bookmarks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── user_integrations already has RLS (see supabase-spotify-table.sql) ──

-- ============================================================
-- Verify — run this after to confirm all tables have RLS on:
-- ============================================================
-- select tablename, rowsecurity
-- from pg_tables
-- where schemaname = 'public'
-- order by tablename;
