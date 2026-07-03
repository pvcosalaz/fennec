// The karma economy's tunable numbers (see DESIGN.md → Karma economy).
// Server enforcement lives in supabase/migrations/20260703_karma*.sql;
// these constants only drive UI copy and the Stripe checkout amount.

export const UPLOAD_COST = 5;        // karma per track upload
export const STAMP_REWARD = 2;       // karma the commenter earns per artist stamp
export const PRO_FREE_PER_MONTH = 5; // Pro perk: free uploads per calendar month

// The purchasable pack. One SKU — price lives here, not in the Stripe
// dashboard, so changing it is a one-line edit.
export const KARMA_PACK = {
  karma: 10,          // 2 uploads
  amountCents: 199,   // $1.99 — below this Stripe's $0.30+2.9% fee eats too much
  name: "Fennec Karma × 10",
  label: "$1.99",
};
