"use client";

/* ═══════════════════════════════════════════════════════════════
   CURRENCY SELECT

   A native <select> on purpose. With 32 options grouped by region,
   a custom popover buys nothing and costs real bugs: this app has
   already shipped two clipping failures from absolutely-positioned
   menus inside overflow/transform ancestors (the notification
   panel, 2026-07-30). Native gives free keyboard nav, type-ahead,
   and the iOS wheel picker on phones.

   Styling a <select> is limited by design — we style the trigger
   and accept the OS list. `color-scheme: dark` makes that list
   dark on both macOS and Windows instead of a white flash.
   ═══════════════════════════════════════════════════════════════ */

import { ChevronDown } from "lucide-react";
import {
  CURRENCIES,
  CURRENCY_REGIONS,
  currencyMeta,
  type Currency,
} from "@/lib/currency";

export function CurrencySelect({
  value,
  onChange,
  className = "",
  id,
  "aria-label": ariaLabel = "Currency",
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const meta = currencyMeta(value);

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as Currency)}
        // The native select sits on top, fully transparent, so it owns the
        // interaction while our own markup below owns the look.
        className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
        style={{ colorScheme: "dark" }}
      >
        {CURRENCY_REGIONS.map((region) => (
          <optgroup key={region} label={region}>
            {CURRENCIES.filter((c) => c.region === region).map((c) => (
              <option key={c.id} value={c.id}>
                {c.id} · {c.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      <span
        aria-hidden
        className="pointer-events-none inline-flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white transition peer-hover:border-accent peer-focus-visible:border-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40"
      >
        <span className="text-sm leading-none">{meta.flag}</span>
        {value}
        <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
      </span>
    </div>
  );
}
