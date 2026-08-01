"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type Option = {
  value: string;
  label: string;
  /** Optional section heading. Options sharing a group render under one. */
  group?: string;
};

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  /** Small pill trigger for toolbars, instead of the full-width field. */
  compact?: boolean;
  /** Shown on the trigger instead of the selected option's full label. */
  triggerLabel?: string;
  /** Which edge the compact menu hangs from. Ignored when full width. */
  align?: "left" | "right";
  "aria-label"?: string;
};

export default function Select({
  value, onChange, options, placeholder = "Select...", className = "",
  compact = false, triggerLabel, align = "left", "aria-label": ariaLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 rounded-xl border transition-colors ${
          compact ? "h-10 px-3 text-xs font-semibold" : "h-11 w-full px-3 text-sm"
        } ${
          open
            ? "border-amber-400/50 bg-zinc-900 text-white"
            : "border-white/10 bg-zinc-900 text-white hover:border-white/20"
        }`}
      >
        <span className={selected || triggerLabel ? "truncate text-white" : "text-zinc-600"}>
          {triggerLabel ?? (selected ? selected.label : placeholder)}
        </span>
        <ChevronDown
          size={15}
          className={`text-zinc-500 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown. A compact trigger is narrower than its own options, so the
          menu stops matching the trigger's width and gets a floor instead. */}
      {open && (
        <div
          className={`absolute top-[calc(100%+6px)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/60 ${
            compact
              ? `min-w-[240px] ${align === "right" ? "right-0" : "left-0"}`
              : "left-0 right-0"
          }`}
        >
          <div className="max-h-64 overflow-y-auto py-1">
            {options.map((opt, i) => {
              const isSelected = opt.value === value;
              const newGroup = opt.group && opt.group !== options[i - 1]?.group;
              return (
                <div key={opt.value}>
                  {newGroup && (
                    <p className="px-4 pb-1 pt-2.5 text-[9.5px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                      {opt.group}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                      isSelected
                        ? "bg-amber-400/10 text-amber-400"
                        : "text-zinc-300 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={13} className="shrink-0 text-amber-400" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
