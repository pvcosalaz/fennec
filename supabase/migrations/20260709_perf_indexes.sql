-- ═══════════════════════════════════════════════════════════════
-- PERFORMANCE INDEXES for hot query paths (2026-07-09)
--
-- Postgres auto-indexes primary keys and UNIQUE constraints, but NOT
-- plain foreign-key or filter columns. Before this, only user_events had
-- indexes — every other table did a sequential scan on user_id / track_id /
-- post_id / recipient_id lookups. Fine at 10 rows, a wall at 100k.
--
-- Every index below backs a real .eq()/.order() the app runs today. The
-- (user_id, created_at desc) shape serves both "filter by me" and "newest
-- first" in a single index. Safe + idempotent: IF NOT EXISTS makes re-runs
-- a no-op. Tables are small pre-launch, so a plain (non-CONCURRENT) build
-- is instant; revisit CONCURRENTLY only once these hold real volume.
-- ═══════════════════════════════════════════════════════════════

-- ── Business hub: "my <thing>, newest first" ──
create index if not exists idx_business_projects_user_created on public.business_projects (user_id, created_at desc);
create index if not exists idx_business_quotes_user_created   on public.business_quotes   (user_id, created_at desc);
create index if not exists idx_business_clients_user_created  on public.business_clients  (user_id, created_at desc);
create index if not exists idx_project_reviews_user_created   on public.project_reviews   (user_id, created_at desc);

-- ── The tape: all marks on a track, in time order ──
create index if not exists idx_review_comments_track on public.review_comments (track_id, created_at);

-- ── Community feed ──
create index if not exists idx_posts_created         on public.posts    (created_at desc);
create index if not exists idx_comments_post_created on public.comments (post_id, created_at);
create index if not exists idx_vibes_post            on public.vibes    (post_id);
create index if not exists idx_bookmarks_post        on public.bookmarks (post_id);

-- ── Notifications: the unread-badge query (user_id + read), newest first ──
create index if not exists idx_notifications_user_read on public.notifications (user_id, read, created_at desc);

-- ── Push: fan-out to a user's devices ──
create index if not exists idx_push_subscriptions_user on public.push_subscriptions (user_id);

-- ── The radio: a producer's voice-note inbox (recipient) + sent (sender) ──
create index if not exists idx_voice_notes_recipient on public.voice_notes (recipient_id, created_at desc);
create index if not exists idx_voice_notes_sender    on public.voice_notes (sender_id, created_at desc);

-- ── Feature suggestions: "my suggestions" ──
create index if not exists idx_suggestions_user on public.suggestions (user_id, created_at desc);

-- ── Karma: balance reads by user + the "already paid on this ref" dedup ──
create index if not exists idx_karma_ledger_user on public.karma_ledger (user_id);
create index if not exists idx_karma_ledger_ref  on public.karma_ledger (ref_id);

-- ── Bot dedup: skip URLs already posted ──
create index if not exists idx_bot_posted_urls_url on public.bot_posted_urls (url);
