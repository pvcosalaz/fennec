-- ─── Fennec CRM — user activity tracking ─────────────────────────────────────
-- Run manually in the Supabase SQL editor:
-- Dashboard → SQL Editor → New query → paste this file → Run

-- 1) Admin flag on profiles — gates access to /admin
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
UPDATE profiles SET is_admin = true WHERE username = 'pvcosalaz';

-- 2) user_events — exploration / navigation / lifecycle history
CREATE TABLE IF NOT EXISTS user_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type       text NOT NULL,
  meta       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Users write their own events; reads happen server-side with the service role,
-- so no select policy is needed.
CREATE POLICY "users_insert_own_events" ON user_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_events_user_created ON user_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_type_created ON user_events (type, created_at DESC);
CREATE INDEX IF NOT EXISTS user_events_created      ON user_events (created_at DESC);

-- Event types written by the app (lib/track.ts):
--   session_start  — app opened with a signed-in user
--   module_view    — bottom-nav navigation, meta: { "tab": "dashboard" | "pricing" | "contenido" | "ideas" | "noticias" }
--   settings_open  — settings opened from the header
--   sign_out       — user signed out
