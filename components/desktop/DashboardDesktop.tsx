"use client";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import FennecIdCard from "@/components/network/FennecIdCard";
import type { FennecIdColor } from "@/lib/fennecIdPalette";
import type { Quote } from "@/lib/pricingData";
import type { Profile } from "@/lib/communityTypes";

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD — desktop content (approved mockup language). Uses the
   REAL FennecIdCard, hairline bands (no boxed grid), and a "Today
   on Fennec" strip fed by real data (latest note, sent quotes, next
   scheduled post). Pure presentation — logic lives in Dashboard.tsx.
   ═══════════════════════════════════════════════════════════════ */

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;

// Same soundwave as the mobile Fennec ID card (fennec-eq-bar keyframe in
// globals.css), just a taller set of bars for the bigger desktop hero.
const EQ_HEIGHTS = [10, 18, 8, 22, 12, 26, 9, 16, 22, 11, 19, 8];

type ContentTask = { title: string; date: string; status: "pending" | "done" };

/** Next upcoming scheduled post from the Marketing module's local store. */
function useNextPost(): ContentTask | null {
  const [next, setNext] = useState<ContentTask | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fennec-content-tasks-v1");
      if (!raw) return;
      const tasks = JSON.parse(raw) as ContentTask[];
      const today = new Date().toISOString().slice(0, 10);
      const upcoming = tasks
        .filter((t) => t.status !== "done" && t.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      setNext(upcoming ?? null);
    } catch { /* ignore */ }
  }, []);
  return next;
}

function fmtDate(d: string): string {
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }).toUpperCase();
}

function Band({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.07), transparent)" }} />
      </div>
      {children}
    </div>
  );
}

function Cols({ children }: { children: React.ReactNode }) {
  return <div className="grid" style={{ gridAutoFlow: "column", gridAutoColumns: "1fr" }}>{children}</div>;
}

function Col({ value, label, sub, muted, onClick, icon }: { value: string; label: string; sub?: string; muted?: boolean; onClick?: () => void; icon?: React.ReactNode }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag type={onClick ? "button" : undefined} onClick={onClick}
      className={`group relative border-l border-white/[0.05] px-[18px] py-[14px] text-left first:border-l-0 first:pl-0.5 ${onClick ? "transition hover:bg-white/[0.02]" : ""}`}>
      {/* hover affordance: a quiet chevron says "this goes somewhere" */}
      {onClick && (
        <ChevronRight className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
      )}
      {icon && <div className="mb-1.5">{icon}</div>}
      <b className={`text-[21px] font-extrabold tabular-nums ${muted ? "text-zinc-600" : "text-white"}`}>{value}</b>
      <span className="mt-[3px] block text-[9px] uppercase tracking-[0.16em] text-zinc-600">{label}</span>
      {sub && <span className="text-[10px] font-semibold text-accent">{sub}</span>}
    </Tag>
  );
}

export default function DashboardDesktop({
  card, networkProfile, fennecDb, cardColorScheme,
  igFollowers, ttFollowers, ytSubs,
  activeProjects, totalProjects, quotesSentCount, quotesOutTotal, karma,
  sentQuotes, latestNote,
  onNavigate, onOpenProfileSettings,
}: {
  card: {
    firstName: string; lastName: string; role: string; country: string;
    genres: string[]; initials: string; avatarUrl?: string | null;
    instagram?: string | null; spotify?: string | null; youtube?: string | null;
    collectionNumber?: number;
  };
  networkProfile?: Profile | null;
  fennecDb: number;
  cardColorScheme: FennecIdColor;
  igFollowers: number | null;
  ttFollowers: number | null;
  ytSubs: number | null;
  activeProjects: number;
  totalProjects: number;
  quotesSentCount: number;
  quotesOutTotal: number;
  karma: number | null;
  sentQuotes: Quote[];
  latestNote: string | null;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  onOpenProfileSettings?: () => void;
}) {
  // The producer's color lives ONLY on the FennecIdCard — it's the card's
  // identity, not the app's. All other accents stay on-brand amber.
  const accent = "#f5a623";
  const nextPost = useNextPost();

  return (
    <div>
      {/* header — greeting follows the actual clock, not a hardcoded evening */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">
          {(() => {
            const h = new Date().getHours();
            const g = h < 5 || h >= 19 ? "Good evening" : h < 12 ? "Good morning" : "Good afternoon";
            return `${g}, ${card.firstName || "there"}.`;
          })()}
        </h1>
        <button
          type="button"
          onClick={() => {
            // Share the PUBLIC card link (/u/username) — recipients get the
            // real Fennec ID page, and the OG image unfurls the card in
            // WhatsApp/iMessage. Desktop browsers often lack navigator.share,
            // so fall back to copying the link.
            const url = `https://app.fennec.audio/u/${networkProfile?.username ?? ""}`;
            const text = `@${networkProfile?.username} · ${fennecDb} dB on Fennec`;
            if (navigator.share) void navigator.share({ title: "My Fennec ID", text, url });
            else void navigator.clipboard?.writeText(url);
          }}
          className="rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold transition hover:brightness-110"
          style={{ borderColor: `${accent}59`, color: accent }}
        >
          Share my ID
        </button>
      </div>

      {/* the real Fennec ID card (left, hero) + dB reading (right) */}
      <div className="grid items-stretch gap-4" style={{ gridTemplateColumns: "1.35fr .85fr" }}>
        <div>
          <FennecIdCard
            firstName={card.firstName} lastName={card.lastName}
            role={card.role || "Producer"} country={card.country}
            genres={card.genres} fennecDb={fennecDb} colorScheme={cardColorScheme}
            initials={card.initials} avatarUrl={card.avatarUrl}
            instagram={card.instagram} spotify={card.spotify} youtube={card.youtube}
            collectionNumber={card.collectionNumber} smallDb
          />
        </div>
        <div className="relative flex flex-col items-center justify-center rounded-2xl border border-white/[0.07] p-6" style={{ background: "#111114" }}>
          {/* radial glow only — clipped on its own layer so it never crops the
              number above it (the old shared overflow:hidden was cutting off
              ascenders like "8") */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute inset-[-40%]" style={{ background: `radial-gradient(40% 32% at 50% 58%, ${accent}22, transparent 70%)` }} />
          </div>
          <span className="relative text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-600">Fennec dB</span>
          <div className="relative text-[76px] font-extrabold" style={{ lineHeight: 1.15, padding: "6px 10px" }}>
            {/* inline-block gives this its own compositing box — a plain inline
                span with filter:drop-shadow + -webkit-background-clip:text
                clips its own right edge in Chromium once the last glyph
                nears the box boundary (the "8" getting cut). */}
            <span
              style={{
                display: "inline-block",
                background: `linear-gradient(180deg, ${accent}, ${accent}cc)`,
                WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                filter: `drop-shadow(0 4px 24px ${accent}40)`,
              }}
            >
              {fennecDb}
            </span>
          </div>
          {/* the tape's soundwave — same EQ bars as the mobile Fennec ID card */}
          <div className="relative flex items-end gap-[3px]" style={{ height: 26, marginTop: 4 }}>
            {EQ_HEIGHTS.map((h, i) => (
              <span key={i} className="fennec-eq-bar" style={{ height: h, width: 3, background: accent, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>

      {/* Music & Business */}
      <Band label="Music & Business">
        <Cols>
          <Col value={String(totalProjects)} label="Projects" sub={activeProjects > 0 ? `${activeProjects} active` : undefined} onClick={() => onNavigate?.("pricing")} />
          <Col value={String(quotesSentCount)} label="Quotes sent" onClick={() => onNavigate?.("pricing")} />
          <Col value={quotesOutTotal > 0 ? usd(quotesOutTotal) : "—"} label="Quotes out" muted={quotesOutTotal === 0} onClick={() => onNavigate?.("pricing")} />
          <Col value={karma != null ? String(karma) : "—"} label="Karma" muted={karma == null} onClick={() => onNavigate?.("ideas")} />
        </Cols>
      </Band>

      {/* Social Reach — same brand-color icons + glow as the mobile SocialChip */}
      <Band label="Social Reach">
        <Cols>
          <Col
            icon={<SiInstagram size={14} style={{ color: "#E1306C", opacity: 0.85, filter: "drop-shadow(0 0 6px #E1306C40)" }} />}
            value={igFollowers != null ? fmtCount(igFollowers) : "—"} label="Instagram" muted={igFollowers == null} sub={igFollowers == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
          <Col
            icon={<SiTiktok size={14} style={{ color: "#e6e6e9", opacity: 0.85, filter: "drop-shadow(0 0 6px #ffffff30)" }} />}
            value={ttFollowers != null ? fmtCount(ttFollowers) : "—"} label="TikTok" muted={ttFollowers == null} sub={ttFollowers == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
          <Col
            icon={<SiYoutube size={14} style={{ color: "#FF0000", opacity: 0.85, filter: "drop-shadow(0 0 6px #FF000040)" }} />}
            value={ytSubs != null ? fmtCount(ytSubs) : "—"} label="YouTube" muted={ytSubs == null} sub={ytSubs == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
        </Cols>
      </Band>

      {/* Today on Fennec — real data (note · quotes · next post) */}
      <Band label="Today on Fennec">
        <div className="grid gap-0" style={{ gridTemplateColumns: "1.2fr 1fr 1fr" }}>
          {/* latest note on your tracks */}
          <button type="button" onClick={() => onNavigate?.("ideas")} className="border-l border-white/[0.05] px-[18px] py-[14px] text-left first:border-l-0 first:pl-0.5 transition hover:bg-white/[0.02]">
            {latestNote ? (
              <>
                <p className="text-[13px] leading-relaxed text-zinc-300" style={{ fontFamily: "var(--font-tape-serif, Georgia, serif)" }}>
                  &ldquo;{latestNote.length > 90 ? latestNote.slice(0, 90) + "…" : latestNote}&rdquo;
                </p>
                <span className="mt-2 block text-[11px] font-semibold text-accent">Open the tape →</span>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-zinc-600">No notes on your tracks yet.</p>
                <span className="mt-2 block text-[11px] font-semibold text-accent">Upload a track for feedback →</span>
              </>
            )}
          </button>

          {/* quotes awaiting reply */}
          <button type="button" onClick={() => onNavigate?.("pricing")} className="border-l border-white/[0.05] px-[18px] py-[14px] text-left transition hover:bg-white/[0.02]">
            {sentQuotes.length > 0 ? (
              <>
                {sentQuotes.slice(0, 2).map((q) => (
                  <div key={q.id} className="flex items-baseline justify-between border-b border-white/[0.04] py-1.5 last:border-b-0">
                    <span className="truncate text-[12.5px] text-zinc-300">{q.clientName || "—"}</span>
                    <span className="ml-2 flex-shrink-0 text-[12px] font-semibold tabular-nums text-white">{usd(q.finalPrice)}
                      <span className="ml-1.5 rounded bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-accent">SENT</span>
                    </span>
                  </div>
                ))}
                <span className="mt-2 block text-[11px] font-semibold text-accent">Quotes awaiting reply →</span>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-zinc-600">No open quotes.</p>
                <span className="mt-2 block text-[11px] font-semibold text-accent">Send a quote →</span>
              </>
            )}
          </button>

          {/* next scheduled post */}
          <button type="button" onClick={() => onNavigate?.("contenido")} className="border-l border-white/[0.05] px-[18px] py-[14px] text-left transition hover:bg-white/[0.02]">
            {nextPost ? (
              <>
                <span className="block font-mono text-[10px] tracking-[0.1em] text-accent">{fmtDate(nextPost.date)}</span>
                <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-300">Next post: {nextPost.title}</p>
                <span className="mt-2 block text-[11px] font-semibold text-accent">Open calendar →</span>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-zinc-600">Nothing scheduled.</p>
                <span className="mt-2 block text-[11px] font-semibold text-accent">Plan your content →</span>
              </>
            )}
          </button>
        </div>
      </Band>
    </div>
  );
}
