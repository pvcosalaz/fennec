"use client";

// Dev-only, 404s in production. Side-by-side of the desktop shell's current
// flat-black surfaces against the "studio at night" proposal, so the call is
// made by looking rather than by reading a description.

import { notFound } from "next/navigation";
import {
  CANVAS_BG, RAIL_BG, RAIL_SHADOW, TILE_BG, TILE_SHADOW, SHEEN, Grain, Atmosphere,
} from "@/components/desktop/surfaces";

const NAV = ["Dashboard", "Business", "The Tape", "Marketing", "Community", "Network"];
const SIDEBAR_W = 232;

/** Faithful enough to judge: rail + canvas + a KPI band + two panels. */
function ShellMock({
  variant,
  label,
}: {
  variant: "current" | "proposed" | "bolder";
  label: string;
}) {
  const proposed = variant !== "current";
  /* His reference had a WHITE rail against dark content. Going white would
     fight Fennec's identity, but the same READ is available by pushing the
     rail further up the value scale and cooling it — a slate panel bolted
     onto a warm room. */
  const railBg = variant === "bolder"
    ? "linear-gradient(180deg, #26252f 0%, #201f29 46%, #1b1a23 100%)"
    : RAIL_BG;

  return (
    <section className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-600">{label}</p>
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          height: 520,
          background: proposed ? CANVAS_BG : "#0b0a08",
        }}
      >
        {/* Decorative layers, proposal only */}
        {proposed && (
          <>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{ left: SIDEBAR_W }}
            >
              <div
                className="absolute"
                style={{
                  right: "-14%", bottom: "-30%",
                  width: 620, aspectRatio: "1",
                  background:
                    "radial-gradient(circle at 50% 55%, rgba(245,166,35,0.075), rgba(245,166,35,0.022) 42%, transparent 68%)",
                }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fennec-icon-transparent.png"
                alt=""
                className="absolute"
                style={{
                  width: 580, height: "auto", right: "-8%", bottom: "-16%", opacity: 0.042,
                  filter: "brightness(0) saturate(100%) invert(72%) sepia(58%) saturate(1180%) hue-rotate(343deg) brightness(101%) contrast(96%)",
                }}
              />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")",
                opacity: 0.05,
                mixBlendMode: "overlay",
              }}
            />
          </>
        )}
        {!proposed && (
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ left: SIDEBAR_W }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/fennec-icon-transparent.png"
              alt=""
              className="absolute"
              style={{
                width: 580, height: "auto", right: "-8%", bottom: "-16%",
                opacity: 0.035, filter: "brightness(0) invert(1)",
              }}
            />
          </div>
        )}

        {/* Rail */}
        <aside
          className="absolute left-0 top-0 bottom-0 z-10 flex flex-col px-3.5 py-5"
          style={{
            width: SIDEBAR_W,
            background: proposed ? railBg : "linear-gradient(180deg,#131116 0%,#0d0c0f 55%,#0b0a08 100%)",
            borderRight: proposed ? "none" : "1px solid rgba(255,255,255,.06)",
            boxShadow: proposed ? RAIL_SHADOW : undefined,
          }}
        >
          <div className="flex items-baseline gap-0.5 px-2.5 pb-6">
            <span className="text-[17px] font-bold tracking-tight text-white">fennec</span>
            <span className="inline-block h-[5px] w-[5px] rounded-full" style={{ background: "#f5a623", boxShadow: "0 0 8px rgba(245,166,35,.8)" }} />
          </div>
          <nav className="flex flex-col gap-0.5">
            {NAV.map((n, i) => (
              <span
                key={n}
                className="relative rounded-[10px] px-2.5 py-[9px] text-[13px] font-medium"
                style={i === 1
                  ? { background: "rgba(245,166,35,.09)", color: "#ffc861" }
                  : { color: "#8b8b93" }}
              >
                {i === 1 && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2.5px] -translate-y-1/2 rounded-full" style={{ background: "#f5a623" }} />
                )}
                {n}
              </span>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="relative z-10 h-full px-10 py-8" style={{ marginLeft: SIDEBAR_W }}>
          <h2 className="text-[19px] font-bold tracking-tight text-white">Business</h2>

          <div className="mt-6 grid gap-4" style={{ gridTemplateColumns: ".85fr 1.35fr" }}>
            <div
              className="relative overflow-hidden rounded-2xl px-6 py-7"
              style={{
                background: proposed ? TILE_BG : "linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",
                boxShadow: proposed ? TILE_SHADOW : "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 30px -20px rgba(0,0,0,0.6)",
              }}
            >
              {proposed && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SHEEN }} />}
              <p className="relative text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">Revenue · MTD</p>
              <p className="relative mt-2 text-[40px] font-extrabold leading-none tracking-tight" style={{ color: "#f5a623" }}>$63,800</p>
              <p className="relative mt-2 text-[10px] text-zinc-500">2 payments this month</p>
            </div>
            <div
              className="relative overflow-hidden rounded-2xl px-6 py-7"
              style={{
                background: proposed ? TILE_BG : "linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",
                boxShadow: proposed ? TILE_SHADOW : "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 30px -20px rgba(0,0,0,0.6)",
              }}
            >
              {proposed && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SHEEN }} />}
              <p className="relative text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">Revenue · last 6 months</p>
              <div className="relative mt-5 flex h-[92px] items-end gap-2.5">
                {[18, 34, 26, 58, 44, 100].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-[4px]"
                    style={{ height: `${h}%`, background: i === 5 ? "#f5a623" : "rgba(255,255,255,.09)" }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div
            className="relative mt-4 overflow-hidden rounded-2xl px-6 py-5"
            style={{
              background: proposed ? TILE_BG : "linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",
              boxShadow: proposed ? TILE_SHADOW : "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 30px -20px rgba(0,0,0,0.6)",
            }}
          >
            {proposed && <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: SHEEN }} />}
            <p className="relative text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">Pipeline</p>
            <div className="relative mt-3 grid grid-cols-3">
              {[["$128,400", "Awaiting reply", "2 quotes out"],
                ["$130,632", "In progress", "2 projects"],
                ["$100,632", "Owed to you", "1 without deposit"]].map(([v, l, s], i) => (
                <div key={l} className={i > 0 ? "border-l border-white/[0.05] pl-[18px]" : ""}>
                  <b className="text-[21px] font-extrabold tabular-nums text-white">{v}</b>
                  <span className="mt-[3px] block text-[9px] uppercase tracking-[0.16em] text-zinc-600">{l}</span>
                  <span className="block text-[10px] font-semibold" style={{ color: "#f5a623" }}>{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SurfacesPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    /* h-[100dvh] + overflow-y-auto because globals.css locks `html` to
       overflow:hidden for the PWA shell, so a plain tall page just clips
       (same bug that made /admin unscrollable, Paco 2026-07-28). */
    <div className="h-[100dvh] overflow-y-auto bg-[#08080a] px-8 py-10">
      <div className="mx-auto w-full space-y-8" style={{ maxWidth: 1180 }}>
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-white">Desktop surfaces</h1>
          <p className="mt-1 max-w-[62ch] text-[13px] leading-relaxed text-zinc-500">
            Same layout, same content, same accent. Only the material changes.
          </p>
        </div>
        <ShellMock variant="current" label="Before · one flat value" />
        <ShellMock variant="proposed" label="Shipped · studio at night, bolder rail" />
      </div>
    </div>
  );
}
