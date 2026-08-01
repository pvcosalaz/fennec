-- ═══════════════════════════════════════════════════════════════
-- QUOTE PAYMENT METHODS
--
-- Where to pay lived inside the free-text notes, so the client's
-- PDF showed a paragraph instead of a payment block, and nothing
-- caught a quote that went out with no way to pay it.
--
-- Method is a picklist, details stay free text: bank data refuses
-- to be modelled (CLABE vs routing vs IBAN+BIC vs a PayPal email),
-- and a rigid form per country would be wrong for somebody.
--
-- Frozen per quote, same rule as currency: changing banks must
-- never rewrite a PDF the client already has.
-- ═══════════════════════════════════════════════════════════════

alter table business_quotes
  add column if not exists payment_methods jsonb not null default '[]'::jsonb;
