-- ═══════════════════════════════════════════════════════════════
-- KARMA v2 — anti-farming + purchases (Paco, 2026-07-03)
--   · Comments NO LONGER earn karma by themselves (people would
--     farm it spamming junk comments). The ONLY earned karma is
--     the artist's stamp: +2 when they seal your mark.
--   · Karma can be bought via Stripe (reason 'purchase' in ledger,
--     ref_id stores the Stripe session id for idempotency).
-- Existing balances are left untouched.
-- ═══════════════════════════════════════════════════════════════

-- 1) Remove the +1-per-comment trigger ------------------------------------
drop trigger if exists trg_karma_on_comment on public.review_comments;
drop function if exists public.fn_karma_on_comment();

-- 2) Ledger: allow 'purchase' + text refs (Stripe ids aren't uuids) --------
alter table public.karma_ledger
  alter column ref_id type text using ref_id::text;

alter table public.karma_ledger
  drop constraint if exists karma_ledger_reason_check;

alter table public.karma_ledger
  add constraint karma_ledger_reason_check
  check (reason in ('comment', 'stamp', 'upload', 'signup', 'purchase'));
