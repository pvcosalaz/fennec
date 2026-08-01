-- ═══════════════════════════════════════════════════════════════
-- QUOTE PIPELINE
--
-- Quotes only knew 'draft' and 'sent', so there was nowhere to
-- record that a client said yes. The app compensated by creating
-- an ACTIVE project the moment you emailed the quote — meaning
-- two quotes nobody had paid a deposit on showed up as
-- "2 projects in progress · $130,632" (Paco 2026-08-01).
--
-- The pipeline is now explicit and manual at every hop:
--   draft → sent → approved → (project: in_progress → review
--                              → delivered → paid)
--   any → declined
-- ═══════════════════════════════════════════════════════════════

alter table business_quotes
  drop constraint if exists business_quotes_status_check;

alter table business_quotes
  add constraint business_quotes_status_check
  check (status in ('draft', 'sent', 'approved', 'declined'));

-- When the client approved, and which project it became. Lets the UI stop
-- offering "start project" on a quote that already produced one, instead of
-- silently creating duplicates.
alter table business_quotes
  add column if not exists approved_at timestamptz,
  add column if not exists project_id  text;
