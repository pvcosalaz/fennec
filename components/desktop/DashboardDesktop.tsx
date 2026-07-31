"use client";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import FennecIdCard from "@/components/network/FennecIdCard";
import type { FennecIdColor } from "@/lib/fennecIdPalette";
import type { Quote } from "@/lib/pricingData";
import type { Profile } from "@/lib/communityTypes";
import type { ContributionDays } from "@/lib/contributions";
import ContributionsCard from "@/components/dashboard/ContributionsCard";

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

function Band({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className ?? "mt-5"}>
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
        <div className="h-px flex-1" style={{ background: "linear-gradient(90deg, rgba(255,255,255,.07), transparent)" }} />
      </div>
      {children}
    </div>
  );
}

/* Subtle grouping surface — the dB panel's materiality (top highlight + tinted
   floor shadow), just lighter. Groups by function without a heavy card box. */
function Tile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-4 pb-3 pt-3.5"
      style={{
        background: "linear-gradient(180deg,rgba(255,255,255,0.025),rgba(255,255,255,0.008))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 14px 30px -20px rgba(0,0,0,0.6)",
      }}
    >
      <span className="mb-1.5 block text-[8.5px] font-bold uppercase tracking-[0.22em] text-zinc-600">{label}</span>
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
      className={`group relative border-l border-white/[0.05] px-[18px] py-[11px] text-left first:border-l-0 first:pl-0.5 ${onClick ? "transition hover:bg-white/[0.02]" : ""}`}>
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
  sentQuotes, latestNote, contributions,
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
  contributions?: ContributionDays | null;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  onOpenProfileSettings?: () => void;
}) {
  // The producer's color lives ONLY on the FennecIdCard — it's the card's
  // identity, not the app's. All other accents stay on-brand amber.
  const accent = "#f5a623";
  const nextPost = useNextPost();

  return (
    <div>
      {/* Staggered entrance — a quiet waterfall so the panel feels assembled,
          not dumped. Enhances an already-laid-out screen (both: fill mode). */}
      <style>{`
        @keyframes ddRise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
        .dd-rise { animation: ddRise .5s cubic-bezier(.16,1,.3,1) both; }
        @media (prefers-reduced-motion: reduce) { .dd-rise { animation: none; } }
      `}</style>
      {/* header — greeting follows the actual clock, not a hardcoded evening */}
      <div className="dd-rise mb-6 flex items-center justify-between">
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
      <div className="dd-rise grid items-stretch gap-4" style={{ gridTemplateColumns: "1.35fr .85fr", animationDelay: ".06s" }}>
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
        {/* dB reading — an instrument, not a boxed stat. Layered surface (top
            highlight + tinted floor shadow) reads as physical; solid amber
            number instead of the gradient-text + outer glow (both AI tells). */}
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl p-6"
          style={{
            background: "linear-gradient(180deg,#151318,#100f13)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 16px 34px -18px rgba(0,0,0,0.7)",
          }}
        >
          {/* a soft amber floor, low and wide — light pooling under the meter,
              not a neon halo around it */}
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(60% 42% at 50% 100%, ${accent}12, transparent 72%)` }} />
          <span className="relative text-[9px] font-bold uppercase tracking-[0.35em] text-zinc-500">Fennec dB</span>
          <div className="relative flex items-baseline" style={{ padding: "2px 4px" }}>
            <span className="text-[92px] font-black tabular-nums leading-none tracking-[-0.035em]" style={{ color: accent }}>
              {fennecDb}
            </span>
          </div>
          {/* the tape's soundwave — same EQ bars as the mobile Fennec ID card */}
          <div className="relative flex items-end gap-[3px]" style={{ height: 24, marginTop: 8 }}>
            {EQ_HEIGHTS.map((h, i) => (
              <span key={i} className="fennec-eq-bar" style={{ height: h, width: 3, background: accent, animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          {/* Real context, not a vanity delta: the audience that actually drives
              the score. Anchors the lone number to its inputs. */}
          {(() => {
            const reach = (igFollowers ?? 0) + (ttFollowers ?? 0) + (ytSubs ?? 0);
            return (
              <span className="relative mt-3 text-[10px] font-medium tracking-wide text-zinc-500">
                {reach > 0
                  ? <><span className="font-bold text-zinc-300">{fmtCount(reach)}</span> total reach</>
                  : "Connect socials to grow"}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Contributions — the dB's visual evidence (same card as mobile, wider
          strip). Amber like every non-ID accent on desktop. */}
      <div className="dd-rise" style={{ animationDelay: ".12s" }}>
        <ContributionsCard data={contributions ?? null} accent="#f5a623" weeks={52} cellSize={11} />
      </div>

      {/* Operational bento — asymmetric surfaces group by function instead of
          stacking three identical hairline bands (design pass 2026-07-31).
          Left (wider): the money & work numbers. Right: today's action feed. */}
      <div className="dd-rise mt-4 grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr", animationDelay: ".18s" }}>
        <Tile label="Music & Business">
          <Cols>
            <Col value={String(totalProjects)} label="Projects" sub={activeProjects > 0 ? `${activeProjects} active` : undefined} onClick={() => onNavigate?.("pricing")} />
            <Col value={String(quotesSentCount)} label="Quotes sent" onClick={() => onNavigate?.("pricing")} />
            <Col value={quotesOutTotal > 0 ? usd(quotesOutTotal) : "—"} label="Quotes out" muted={quotesOutTotal === 0} onClick={() => onNavigate?.("pricing")} />
            <Col value={karma != null ? String(karma) : "—"} label="Karma" muted={karma == null} onClick={() => onNavigate?.("ideas")} />
          </Cols>
        </Tile>

        <Tile label="Today on Fennec">
          <div className="flex flex-col divide-y divide-white/[0.05]">
            {/* latest note on your tracks */}
            <button type="button" onClick={() => onNavigate?.("ideas")} className="group flex items-center justify-between gap-3 py-[9px] text-left transition first:pt-0">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {latestNote ? "New note on your track" : "No track feedback yet"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">
                {latestNote ? "Open →" : "Upload →"}
              </span>
            </button>
            {/* quotes awaiting reply */}
            <button type="button" onClick={() => onNavigate?.("pricing")} className="group flex items-center justify-between gap-3 py-[9px] text-left">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {sentQuotes.length > 0 ? `${sentQuotes.length} quote${sentQuotes.length > 1 ? "s" : ""} awaiting reply` : "No open quotes"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">
                {sentQuotes.length > 0 ? "View →" : "Send →"}
              </span>
            </button>
            {/* next scheduled post */}
            <button type="button" onClick={() => onNavigate?.("contenido")} className="group flex items-center justify-between gap-3 py-[9px] text-left">
              <span className="min-w-0 truncate text-[12px] text-zinc-400">
                {nextPost ? `Next post · ${fmtDate(nextPost.date)}` : "Nothing scheduled"}
              </span>
              <span className="flex-shrink-0 text-[11px] font-semibold text-accent transition group-hover:brightness-110">
                {nextPost ? "Calendar →" : "Plan →"}
              </span>
            </button>
          </div>
        </Tile>
      </div>

      {/* Social Reach — slim full-width strip, flat brand icons (no neon glow) */}
      <Band label="Social Reach" className="dd-rise mt-5">
        <Cols>
          <Col
            icon={<SiInstagram size={14} style={{ color: "#E1306C", opacity: 0.9 }} />}
            value={igFollowers != null ? fmtCount(igFollowers) : "—"} label="Instagram" muted={igFollowers == null} sub={igFollowers == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
          <Col
            icon={<SiTiktok size={14} style={{ color: "#e6e6e9", opacity: 0.9 }} />}
            value={ttFollowers != null ? fmtCount(ttFollowers) : "—"} label="TikTok" muted={ttFollowers == null} sub={ttFollowers == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
          <Col
            icon={<SiYoutube size={14} style={{ color: "#FF0000", opacity: 0.9 }} />}
            value={ytSubs != null ? fmtCount(ytSubs) : "—"} label="YouTube" muted={ytSubs == null} sub={ytSubs == null ? "connect →" : undefined} onClick={onOpenProfileSettings} />
        </Cols>
      </Band>
    </div>
  );
}
