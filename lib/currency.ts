"use client";
import { useEffect, useState } from "react";

/* ═══════════════════════════════════════════════════════════════
   MONEY — one formatter for the whole app.

   Before this, `formatCOP()` hardcoded Colombian pesos and a second
   local `usd()` helper just prefixed "$", so a Mexican producer
   quoting MXN saw COP and US formatting side by side and the
   currency picker in Settings did nothing (Paco 2026-07-31, while
   quoting a real client).

   Rule: a money value on screen is either (a) the user's current
   currency, or (b) the currency the document was WRITTEN in. Quotes
   and projects store their own currency so a later settings change
   never rewrites the price a client already saw.
   ═══════════════════════════════════════════════════════════════ */

export const CURRENCY_KEY = "fennec-currency-v1";
export type Currency = "COP" | "MXN" | "USD";

export const CURRENCIES: { id: Currency; label: string; symbol: string; flag: string }[] = [
  { id: "COP", label: "Colombian Peso", symbol: "$", flag: "\u{1F1E8}\u{1F1F4}" },
  { id: "MXN", label: "Mexican Peso",   symbol: "$", flag: "\u{1F1F2}\u{1F1FD}" },
  { id: "USD", label: "US Dollar",      symbol: "$", flag: "\u{1F1FA}\u{1F1F8}" },
];

const LOCALE: Record<Currency, string> = {
  COP: "es-CO",
  MXN: "es-MX",
  USD: "en-US",
};

/** The user's chosen currency. SSR-safe: falls back to COP (the app default)
 *  on the server and before hydration. */
export function getCurrency(): Currency {
  if (typeof window === "undefined") return "COP";
  try {
    const c = localStorage.getItem(CURRENCY_KEY) as Currency | null;
    return c && c in LOCALE ? c : "COP";
  } catch {
    return "COP";
  }
}

/**
 * Format money for UI. Whole amounts drop the decimals (a dashboard reads
 * better as $76,500 than $76,500.00); anything with cents keeps two.
 */
export function formatMoney(value: number, currency: Currency = getCurrency()): string {
  const whole = Number.isInteger(value);
  return new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
}

/**
 * Format money for a DOCUMENT (quote PDF, line items). Always two decimals and
 * an explicit currency code, because a client-facing total must be unambiguous:
 * "$55,000.00 MXN", never a bare "$55,000".
 */
export function formatMoneyDoc(value: number, currency: Currency = getCurrency()): string {
  const n = new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${n} ${currency}`;
}

/** Live currency, so a change in Settings updates open screens. */
export function useCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>("COP");

  useEffect(() => {
    setCurrency(getCurrency());
    // `storage` covers other tabs; the custom event covers this one, since
    // localStorage writes don't notify the tab that made them.
    const sync = () => setCurrency(getCurrency());
    window.addEventListener("storage", sync);
    window.addEventListener("fennec:currency", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("fennec:currency", sync);
    };
  }, []);

  return currency;
}

/** Call after writing CURRENCY_KEY so open screens re-render. */
export function notifyCurrencyChange() {
  try { window.dispatchEvent(new Event("fennec:currency")); } catch { /* ignore */ }
}
