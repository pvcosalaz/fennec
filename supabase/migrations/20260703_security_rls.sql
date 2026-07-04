-- ═══════════════════════════════════════════════════════════════
-- SECURITY HARDENING — profiles column privileges (2026-07-03)
--
-- Two real holes found in the general security review:
--
-- 1) PRIVILEGE ESCALATION (critical): the "users update own profile"
--    RLS policy only checks the ROW (auth.uid() = id), not the COLUMNS.
--    Any logged-in user could run, from the browser console:
--        supabase.from("profiles")
--          .update({ is_admin: true, karma: 999999, is_pro: true })
--          .eq("id", myId)
--    → self-promote to admin, mint infinite karma (breaks the whole
--      economy), and unlock Pro for free (bypasses Stripe).
--
-- 2) SENSITIVE DATA EXPOSURE (medium): the public SELECT policy exposed
--    every column to the anon key (which ships in the client bundle) —
--    including stripe_customer_id and is_admin, letting anyone enumerate
--    admins and billing ids.
--
-- Fix: Postgres COLUMN-LEVEL privileges. RLS controls rows; GRANTs
-- control columns. PostgREST expands `select=*` to the granted columns,
-- so existing select("*") calls keep working and simply stop returning
-- the sensitive fields.
--
-- The karma triggers / stamp_comment RPC are SECURITY DEFINER (they run
-- as the table owner, not as `authenticated`), so revoking authenticated's
-- write access to karma does NOT break earning/spending. Same for the
-- cron (service_role) that writes followers and is_pro.
-- ═══════════════════════════════════════════════════════════════

-- ── SELECT: hide sensitive columns from the public/anon + authenticated ──
revoke select on public.profiles from anon, authenticated;

grant select (
  id, username, avatar_url, is_pro, is_bot, fennec_db_score, created_at,
  bio, genres, worked_with, worked_in, banner_url, display_name, role,
  country, instagram, spotify, youtube_url, tiktok, color_id,
  ig_followers, tiktok_followers, yt_subscribers, social_synced_at, karma
) on public.profiles to anon, authenticated;
-- Deliberately NOT granted: stripe_customer_id, is_admin
-- (service_role keeps full access for the server-side /api routes.)

-- ── UPDATE: users may only edit their own PROFILE fields, never the
--    economy/authorization ones ──
revoke update on public.profiles from authenticated;

grant update (
  username, avatar_url, banner_url, bio, genres, worked_with, worked_in,
  display_name, role, country, instagram, spotify, youtube_url, tiktok,
  color_id, fennec_db_score
) on public.profiles to authenticated;
-- Deliberately NOT grantable by users: is_admin, karma, is_pro,
-- stripe_customer_id, followers, social_synced_at, is_bot, created_at, id.
-- Those move only through SECURITY DEFINER functions, Stripe webhooks,
-- or the cron — all running as the owner / service_role.

-- The existing RLS row policy ("users update own profile", auth.uid() = id)
-- still applies on top of these column grants.
