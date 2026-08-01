"use client";

/* ═══════════════════════════════════════════════════════════════
   CURRENCY SELECT

   Wraps the app's own Select. The first version used a native
   <select> to dodge the clipping bugs absolutely-positioned menus
   had already caused twice — but the OS list arrives with system
   colours (that purple highlight) and its own frame, so it read as
   a foreign object dropped into the app (Paco 2026-08-01).

   Select is used elsewhere inside these same scrolling forms, so
   the clipping worry doesn't apply to it here: it opens downward
   inside the card, not out of a transformed rail.
   ═══════════════════════════════════════════════════════════════ */

import Select from "@/components/ui/Select";
import { CURRENCIES, currencyMeta, type Currency } from "@/lib/currency";

const OPTIONS = CURRENCIES.map((c) => ({
  value: c.id,
  label: `${c.flag}  ${c.id} · ${c.label}`,
  group: c.region,
}));

export function CurrencySelect({
  value,
  onChange,
  className = "",
  align = "right",
  "aria-label": ariaLabel = "Currency",
}: {
  value: Currency;
  onChange: (c: Currency) => void;
  className?: string;
  /** Defaults to right: this pill lives at the end of a toolbar row. */
  align?: "left" | "right";
  "aria-label"?: string;
}) {
  const meta = currencyMeta(value);

  return (
    <Select
      value={value}
      onChange={(v) => onChange(v as Currency)}
      options={OPTIONS}
      className={className}
      compact
      align={align}
      // The pill shows flag + code; the full name lives in the list.
      triggerLabel={`${meta.flag}  ${meta.id}`}
      aria-label={ariaLabel}
    />
  );
}
