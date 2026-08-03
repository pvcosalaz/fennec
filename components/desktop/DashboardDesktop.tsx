"use client";
import { useEffect, useState } from "react";
import { formatMoney } from "@/lib/currency";
import { SiInstagram, SiTiktok, SiYoutube } from "react-icons/si";
import FennecIdCard from "@/components/network/FennecIdCard";
import type { FennecIdColor } from "@/lib/fennecIdPalette";
import type { Quote } from "@/lib/pricingData";
import type { Profile, Post } from "@/lib/communityTypes";
import type { ContributionDays } from "@/lib/contributions";
import ContributionsCard from "@/components/dashboard/ContributionsCard";
import CommunityPulse from "@/components/dashboard/CommunityPulse";
import { StudioBackdrop, StudioPhotoControl } from "@/components/dashboard/StudioBackdrop";
import { RiseStyle, Band, Tile, Cols, Col, Instrument } from "@/components/desktop/ui";

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





export default function DashboardDesktop({
  card, networkProfile, fennecDb, cardColorScheme,
  igFollowers, ttFollowers, ytSubs,
  activeProjects, totalProjects, quotesSentCount, quotesOutTotal, karma,
  sentQuotes, latestNote, contributions,
  communityPosts, communityLoading = false,
  studioPhotoUrl, studioPhotoLuma, userId, onStudioPhotoChange,
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
  /** Latest community posts. `null` while unknown, `[]` when genuinely empty. */
  communityPosts?: Post[] | null;
  communityLoading?: boolean;
  /** The producer's studio photo and its measured brightness (drives the veil). */
  studioPhotoUrl?: string | null;
  studioPhotoLuma?: number | null;
  userId?: string;
  onStudioPhotoChange?: (url: string | null, luma: number | null) => void;
  onNavigate?: (tab: "pricing" | "contenido" | "dashboard" | "ideas" | "noticias") => void;
  onOpenProfileSettings?: () => void;
}) {
  // The producer's color lives ONLY on the FennecIdCard — it's the card's
  // identity, not the app's. All other accents stay on-brand amber.
  const accent = "#f5a623";
  const nextPost = useNextPost();

  /* ── Spacing ──
     The vertical scale used to run 24 → 0 → 16 → 20 between blocks. Arbitrary,
     and one of them was ZERO: the Fennec ID row and Contributions had nothing
     between them, which is why the three cards read as one glued mass
     (Paco 2026-08-02).

     Two tiers now, so space carries meaning instead of just existing:
       16px  inside a group — these belong together
       28px  between groups — these are different subjects

     The groups are the actual subjects of the page: who you are (ID, dB,
     contributions), what you're running (money, today), and where you reach.

     h-full + flex lets the page own the viewport, and Social Reach takes the
     slack with mt-auto. That kills the dead zone at the bottom without
     inventing content to fill it: the strip simply sits on the floor, the way
     a status bar does, and on a short window it just stacks normally. */
  return (
    <div className="relative flex h-full flex-col">
      {/* The producer's room, when they've set one. Absent by default, so the
          dashboard is unchanged for anyone who never uploads. */}
      {studioPhotoUrl && <StudioBackdrop url={studioPhotoUrl} luma={studioPhotoLuma ?? null} />}
      <RiseStyle />
      {/* header — greeting follows the actual clock, not a hardcoded evening */}
      <div className="dd-rise mb-7 flex flex-shrink-0 items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight text-white">
          {(() => {
            const h = new Date().getHours();
            const g = h < 5 || h >= 19 ? "Good evening" : h < 12 ? "Good morning" : "Good afternoon";
            return `${g}, ${card.firstName || "there"}.`;
          })()}
        </h1>
        <div className="flex items-center gap-4">
        {/* Personalisation sits next to sharing: both are about how this
            screen represents you, and neither belongs in Settings where
            you'd never think to look for a wallpaper. */}
        {userId && onStudioPhotoChange && (
          <StudioPhotoControl
            userId={userId}
            hasPhoto={!!studioPhotoUrl}
            onChange={onStudioPhotoChange}
          />
        )}
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
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-7">

      {/* ── Who you are ──
          The card, the reading it produces, and the evidence behind it. One
          subject, so they sit at group distance from each other and section
          distance from everything else. */}
      <div className="flex flex-col gap-4">

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
        {/* dB reading — the shared Instrument, same piece Business uses for
            revenue. No subtitle: the dB stands alone (Paco likes it solitary),
            and a "total reach = followers" line pushed producers toward
            creator/vanity metrics, which is exactly what Fennec avoids. */}
        <Instrument
          label="Fennec dB"
          value={String(fennecDb)}
          footer={
            /* the tape's soundwave — same EQ bars as the mobile Fennec ID card */
            <div className="relative flex items-end gap-[3px]" style={{ height: 24, marginTop: 10 }}>
              {EQ_HEIGHTS.map((h, i) => (
                <span key={i} className="fennec-eq-bar" style={{ height: h, width: 3, background: accent, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          }
        />
      </div>

      {/* Contributions — the dB's visual evidence (same card as mobile, wider
          strip). Amber like every non-ID accent on desktop. */}
      <div className="dd-rise" style={{ animationDelay: ".12s" }}>
        <ContributionsCard data={contributions ?? null} accent="#f5a623" weeks={52} cellSize={11} />
      </div>

      </div>{/* /who you are */}

      {/* Operational bento — asymmetric surfaces group by function instead of
          stacking three identical hairline bands (design pass 2026-07-31).
          Left (wider): the money & work numbers. Right: today's action feed. */}
      <div className="dd-rise grid gap-4" style={{ gridTemplateColumns: "1.55fr 1fr", animationDelay: ".18s" }}>
        <Tile label="Music & Business">
          <Cols>
            <Col value={String(totalProjects)} label="Projects" sub={activeProjects > 0 ? `${activeProjects} active` : undefined} onClick={() => onNavigate?.("pricing")} />
            <Col value={String(quotesSentCount)} label="Quotes sent" onClick={() => onNavigate?.("pricing")} />
            <Col value={quotesOutTotal > 0 ? formatMoney(quotesOutTotal) : "—"} label="Quotes out" muted={quotesOutTotal === 0} onClick={() => onNavigate?.("pricing")} />
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

      {/* ── What everyone else is doing ──
          Takes the leftover height (flex-1), because a list is the one thing
          on this page that genuinely improves with more room — stretching four
          stat numbers to fill a gap just makes tall empty tiles. */}
      <div className="dd-rise flex min-h-0 flex-1 flex-col" style={{ animationDelay: ".24s" }}>
        <CommunityPulse
          posts={communityPosts ?? null}
          loading={communityLoading}
          onOpen={() => onNavigate?.("noticias")}
        />
      </div>

      {/* Social Reach — slim full-width strip, flat brand icons (no neon glow) */}
      <Band label="Social Reach" className="dd-rise">
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

      </div>{/* /content column */}
    </div>
  );
}
