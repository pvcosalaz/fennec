-- Quote as a document, not a number (Paco 2026-07-31, quoting a real client):
-- line items, a per-quote tax, and the currency the quote was WRITTEN in.
--
-- items is jsonb rather than its own table: concepts are never queried apart
-- from their quote, so a separate table would only add a join and a second
-- RLS policy to keep in sync.
--
-- currency is frozen per quote on purpose. Changing the app-wide setting must
-- never rewrite a price a client already saw.

alter table public.business_quotes
  add column if not exists items      jsonb       not null default '[]'::jsonb,
  add column if not exists tax_label  text,
  add column if not exists tax_rate   numeric     not null default 0,
  add column if not exists currency   text        not null default 'COP',
  add column if not exists updated_at timestamptz,
  add column if not exists valid_until date;

-- Existing quotes keep working: the app migrates them in memory to a single
-- concept (see quoteItems() in lib/pricingData.ts), so no data backfill is
-- needed and nothing breaks if this runs on a table that already has rows.

comment on column public.business_quotes.items is
  'QuoteItem[] — {id, concept, qty, unitPrice, note?}. Empty for pre-breakdown quotes.';
comment on column public.business_quotes.tax_rate is
  'Decimal, e.g. 0.16 for IVA 16%. 0 = no tax, which is legitimate.';
comment on column public.business_quotes.currency is
  'Currency the quote was written in, frozen at creation.';
