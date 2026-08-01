-- ═══════════════════════════════════════════════════════════════
-- PROJECT WORKSPACE
--
-- A project was a name, a price and a date. Everything that makes
-- a scoring job actually workable lived somewhere else: the
-- deliverables in the quote PDF, the deposit in a bank app, the
-- client's reference tracks in WhatsApp.
--
--   deliverables · copied from the approved quote's line items, so
--                  what you charged for IS what you owe
--   payments     · deposit + installments, so the board can tell
--                  "billed" from "collected"
--   brief        · references (with WHY each was sent), genre,
--                  mood, instrumentation, tempo, key, formats
--   currency     · frozen per project, same rule as quotes
-- ═══════════════════════════════════════════════════════════════

alter table business_projects
  add column if not exists deliverables jsonb not null default '[]'::jsonb,
  add column if not exists payments     jsonb not null default '[]'::jsonb,
  add column if not exists brief        jsonb,
  add column if not exists currency     text;
