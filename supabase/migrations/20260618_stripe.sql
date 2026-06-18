-- Stripe integration — run manually in Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_stripe_customer_id ON profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
