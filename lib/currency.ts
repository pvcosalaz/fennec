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

/* Three currencies was a placeholder, not a decision: producers work with
   clients abroad constantly, and a Chilean quoting a Spanish label had no
   option that wasn't a lie (Paco 2026-08-01). The list below is deliberately
   NOT "every ISO code" — it's the currencies music work actually gets paid in,
   grouped so the picker stays scannable. */
export type Currency =
  | "USD" | "MXN" | "COP" | "BRL" | "ARS" | "CLP" | "PEN" | "UYU"
  | "DOP" | "CRC" | "GTQ" | "BOB" | "PYG" | "CAD"
  | "EUR" | "GBP" | "CHF" | "SEK" | "NOK" | "DKK" | "PLN"
  | "JPY" | "AUD" | "NZD" | "INR" | "KRW" | "CNY" | "SGD"
  | "ZAR" | "AED" | "ILS" | "TRY";

export type CurrencyRegion = "Americas" | "Europe" | "Asia & Pacific" | "Other";

export const CURRENCIES: {
  id: Currency; label: string; symbol: string; flag: string; region: CurrencyRegion;
}[] = [
  // ── Americas ──
  { id: "USD", label: "US Dollar",           symbol: "$",   flag: "\u{1F1FA}\u{1F1F8}", region: "Americas" },
  { id: "MXN", label: "Mexican Peso",        symbol: "$",   flag: "\u{1F1F2}\u{1F1FD}", region: "Americas" },
  { id: "COP", label: "Colombian Peso",      symbol: "$",   flag: "\u{1F1E8}\u{1F1F4}", region: "Americas" },
  { id: "BRL", label: "Brazilian Real",      symbol: "R$",  flag: "\u{1F1E7}\u{1F1F7}", region: "Americas" },
  { id: "ARS", label: "Argentine Peso",      symbol: "$",   flag: "\u{1F1E6}\u{1F1F7}", region: "Americas" },
  { id: "CLP", label: "Chilean Peso",        symbol: "$",   flag: "\u{1F1E8}\u{1F1F1}", region: "Americas" },
  { id: "PEN", label: "Peruvian Sol",        symbol: "S/",  flag: "\u{1F1F5}\u{1F1EA}", region: "Americas" },
  { id: "UYU", label: "Uruguayan Peso",      symbol: "$",   flag: "\u{1F1FA}\u{1F1FE}", region: "Americas" },
  { id: "DOP", label: "Dominican Peso",      symbol: "RD$", flag: "\u{1F1E9}\u{1F1F4}", region: "Americas" },
  { id: "CRC", label: "Costa Rican Colón", symbol: "₡", flag: "\u{1F1E8}\u{1F1F7}", region: "Americas" },
  { id: "GTQ", label: "Guatemalan Quetzal",  symbol: "Q",   flag: "\u{1F1EC}\u{1F1F9}", region: "Americas" },
  { id: "BOB", label: "Bolivian Boliviano",  symbol: "Bs",  flag: "\u{1F1E7}\u{1F1F4}", region: "Americas" },
  { id: "PYG", label: "Paraguayan Guaraní", symbol: "₲", flag: "\u{1F1F5}\u{1F1FE}", region: "Americas" },
  { id: "CAD", label: "Canadian Dollar",     symbol: "$",   flag: "\u{1F1E8}\u{1F1E6}", region: "Americas" },
  // ── Europe ──
  { id: "EUR", label: "Euro",                symbol: "€", flag: "\u{1F1EA}\u{1F1FA}", region: "Europe" },
  { id: "GBP", label: "British Pound",       symbol: "£", flag: "\u{1F1EC}\u{1F1E7}", region: "Europe" },
  { id: "CHF", label: "Swiss Franc",         symbol: "CHF", flag: "\u{1F1E8}\u{1F1ED}", region: "Europe" },
  { id: "SEK", label: "Swedish Krona",       symbol: "kr",  flag: "\u{1F1F8}\u{1F1EA}", region: "Europe" },
  { id: "NOK", label: "Norwegian Krone",     symbol: "kr",  flag: "\u{1F1F3}\u{1F1F4}", region: "Europe" },
  { id: "DKK", label: "Danish Krone",        symbol: "kr",  flag: "\u{1F1E9}\u{1F1F0}", region: "Europe" },
  { id: "PLN", label: "Polish Złoty",   symbol: "zł", flag: "\u{1F1F5}\u{1F1F1}", region: "Europe" },
  // ── Asia & Pacific ──
  { id: "JPY", label: "Japanese Yen",        symbol: "¥", flag: "\u{1F1EF}\u{1F1F5}", region: "Asia & Pacific" },
  { id: "AUD", label: "Australian Dollar",   symbol: "$",   flag: "\u{1F1E6}\u{1F1FA}", region: "Asia & Pacific" },
  { id: "NZD", label: "New Zealand Dollar",  symbol: "$",   flag: "\u{1F1F3}\u{1F1FF}", region: "Asia & Pacific" },
  { id: "INR", label: "Indian Rupee",        symbol: "₹", flag: "\u{1F1EE}\u{1F1F3}", region: "Asia & Pacific" },
  { id: "KRW", label: "South Korean Won",    symbol: "₩", flag: "\u{1F1F0}\u{1F1F7}", region: "Asia & Pacific" },
  { id: "CNY", label: "Chinese Yuan",        symbol: "¥", flag: "\u{1F1E8}\u{1F1F3}", region: "Asia & Pacific" },
  { id: "SGD", label: "Singapore Dollar",    symbol: "$",   flag: "\u{1F1F8}\u{1F1EC}", region: "Asia & Pacific" },
  // ── Other ──
  { id: "ZAR", label: "South African Rand",  symbol: "R",   flag: "\u{1F1FF}\u{1F1E6}", region: "Other" },
  { id: "AED", label: "UAE Dirham",          symbol: "د.إ", flag: "\u{1F1E6}\u{1F1EA}", region: "Other" },
  { id: "ILS", label: "Israeli Shekel",      symbol: "₪", flag: "\u{1F1EE}\u{1F1F1}", region: "Other" },
  { id: "TRY", label: "Turkish Lira",        symbol: "₺", flag: "\u{1F1F9}\u{1F1F7}", region: "Other" },
];

export const CURRENCY_REGIONS: CurrencyRegion[] = ["Americas", "Europe", "Asia & Pacific", "Other"];

/** Lookup by code, for rendering a picker's current value. */
export const currencyMeta = (id: Currency) =>
  CURRENCIES.find((c) => c.id === id) ?? CURRENCIES[0];

/** Country → currency. The app defaulted everyone to COP, so a Mexican
 *  producer quoting in pesos got Colombian formatting and a quote frozen in
 *  COP without ever being asked (Paco 2026-08-01). Fennec already knows the
 *  country from the profile; it should never have needed asking. */
const COUNTRY_CURRENCY: [RegExp, Currency][] = [
  [/m[eé]xico|mexico|^mx$/,                    "MXN"],
  [/colombia|^co$/,                            "COP"],
  [/brasil|brazil|^br$/,                       "BRL"],
  [/argentina|^ar$/,                           "ARS"],
  [/chile|^cl$/,                               "CLP"],
  [/per[uú]|^pe$/,                             "PEN"],
  [/uruguay|^uy$/,                             "UYU"],
  [/dominican|rep[uú]blica dominicana|^do$/,   "DOP"],
  [/costa rica|^cr$/,                          "CRC"],
  [/guatemala|^gt$/,                           "GTQ"],
  [/bolivia|^bo$/,                             "BOB"],
  [/paraguay|^py$/,                            "PYG"],
  [/canad[aá]|canada|^ca$/,                    "CAD"],
  [/spain|espa[nñ]a|france|francia|germany|alemania|italy|italia|portugal|netherlands|ireland|austria|belgium|greece|finland|^es$|^fr$|^de$|^it$|^pt$|^nl$/, "EUR"],
  [/united kingdom|reino unido|england|^uk$|^gb$/, "GBP"],
  [/switzerland|suiza|^ch$/,                   "CHF"],
  [/sweden|suecia|^se$/,                       "SEK"],
  [/norway|noruega|^no$/,                      "NOK"],
  [/denmark|dinamarca|^dk$/,                   "DKK"],
  [/poland|polonia|^pl$/,                      "PLN"],
  [/jap[oó]n|japan|^jp$/,                      "JPY"],
  [/australia|^au$/,                           "AUD"],
  [/new zealand|nueva zelanda|^nz$/,           "NZD"],
  [/india|^in$/,                               "INR"],
  [/korea|corea|^kr$/,                         "KRW"],
  [/china|^cn$/,                               "CNY"],
  [/singapore|singapur|^sg$/,                  "SGD"],
  [/south africa|sud[aá]frica|^za$/,           "ZAR"],
  [/emirates|emiratos|^ae$/,                   "AED"],
  [/israel|^il$/,                              "ILS"],
  [/turkey|turqu[ií]a|t[uü]rkiye|^tr$/,        "TRY"],
];

export function defaultCurrencyForCountry(country?: string | null): Currency {
  const c = (country ?? "").trim().toLowerCase();
  if (!c) return "USD";
  for (const [re, cur] of COUNTRY_CURRENCY) if (re.test(c)) return cur;
  // Everything else quotes in USD rather than inheriting someone else's peso.
  return "USD";
}

/** Seed the currency from the profile country, but ONLY if the user never
 *  picked one. An explicit choice in Settings always wins. */
export function seedCurrencyFromCountry(country?: string | null): void {
  if (typeof window === "undefined" || !country) return;
  try {
    if (localStorage.getItem(CURRENCY_KEY)) return; // already chosen
    localStorage.setItem(CURRENCY_KEY, defaultCurrencyForCountry(country));
    notifyCurrencyChange();
  } catch { /* ignore */ }
}

/** Each currency formats in its HOME locale, so separators look native on the
 *  document ("1.234,56 €", "¥1,235"). */
const LOCALE: Record<Currency, string> = {
  USD: "en-US", MXN: "es-MX", COP: "es-CO", BRL: "pt-BR", ARS: "es-AR",
  CLP: "es-CL", PEN: "es-PE", UYU: "es-UY", DOP: "es-DO", CRC: "es-CR",
  GTQ: "es-GT", BOB: "es-BO", PYG: "es-PY", CAD: "en-CA",
  EUR: "de-DE", GBP: "en-GB", CHF: "de-CH", SEK: "sv-SE", NOK: "nb-NO",
  DKK: "da-DK", PLN: "pl-PL",
  JPY: "ja-JP", AUD: "en-AU", NZD: "en-NZ", INR: "en-IN", KRW: "ko-KR",
  CNY: "zh-CN", SGD: "en-SG",
  ZAR: "en-ZA", AED: "ar-AE", ILS: "he-IL", TRY: "tr-TR",
};

/** Currencies with no minor unit — forcing "2 decimals" on a document would
 *  print ¥55,000.00, which no Japanese client has ever seen on an invoice. */
const naturalDigits = (currency: Currency): number => {
  try {
    return new Intl.NumberFormat(LOCALE[currency], { style: "currency", currency })
      .resolvedOptions().maximumFractionDigits ?? 2;
  } catch { return 2; }
};

/** The user's chosen currency. SSR-safe: falls back to USD on the server and
 *  before hydration. */
export function getCurrency(): Currency {
  if (typeof window === "undefined") return "USD";
  try {
    const c = localStorage.getItem(CURRENCY_KEY) as Currency | null;
    return c && c in LOCALE ? c : "USD";
  } catch {
    return "USD";
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
  const digits = naturalDigits(currency);
  const n = new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
  return `${n} ${currency}`;
}

/** Live currency, so a change in Settings updates open screens. */
export function useCurrency(): Currency {
  const [currency, setCurrency] = useState<Currency>("USD");

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
