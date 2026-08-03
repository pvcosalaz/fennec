-- ═══════════════════════════════════════════════════════════════
-- STUDIO PHOTO
--
-- The producer's own room behind their dashboard, so the home
-- screen feels like their headquarters instead of a template
-- (Paco 2026-08-02).
--
-- `studio_photo_luma` is the photo's measured brightness, 0 to 1,
-- computed in the browser at upload. The dashboard's scrim is
-- derived from it, so a dark room gets almost no veil and a bright
-- one gets pushed down until the cards stay readable. Storing the
-- number means the dashboard never has to analyse pixels at render.
-- ═══════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists studio_photo_url  text,
  add column if not exists studio_photo_luma real;
