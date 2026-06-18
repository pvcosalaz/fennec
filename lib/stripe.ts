import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-05-28.basil",
});

export const PRICES = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY!,
  yearly:  process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY!,
} as const;
