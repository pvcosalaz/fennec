
"use client";

import { useSheetDismiss, SHEET_BOTTOM } from "@/components/ui/useSheetDismiss";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Pencil, Check, ArrowLeft,
  Lightbulb, Calendar, Sparkles, Lock,
  BookOpen, Smile, Quote, Music2, GraduationCap,
} from "lucide-react";
import { SiYoutube } from "react-icons/si";
import {
  IDEAS_BANK_KEY, BRIEFS_KEY,
  type Idea, type IdeaCategory, type Brief,
} from "@/lib/contentData";
import CalendarHub from "./CalendarHub";
import ContentHubDesktop from "./ContentHubDesktop";
import SchedulePrompt from "./SchedulePrompt";
import ScriptWriterOverlay from "./ScriptWriterOverlay";
import ScriptDetailOverlay from "./ScriptDetailOverlay";
import MusicContentLab from "./MusicContentLab";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { supabase } from "@/lib/supabase";

const TASKS_KEY = "fennec-content-tasks-v1";

type ActiveSheet = "none" | "inspire" | "ideas" | "scripts" | "lab";

type ContentTask = {
  id: string;
  title: string;
  date: string;        // "YYYY-MM-DD"
  notes?: string;
  source: "manual" | "inspire" | "ideas" | "scripts";
  status: "pending" | "done";
  createdAt: number;
};

type VideoRef = {
  title: string;
  channel: string;
  angle: string;
  why: string;
  url: string;
  thumbnail: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const IDEA_CATEGORIES: { id: IdeaCategory; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: "music-ideas", label: "Music Ideas",  icon: Music2         },
  { id: "meme",        label: "Memes",        icon: Smile          },
  { id: "frase",       label: "Quotes",       icon: Quote          },
  { id: "tutoriales",  label: "Tutorials",    icon: GraduationCap  },
  { id: "referencia",  label: "References",   icon: BookOpen       },
];

// ─── Ideas Bank ───────────────────────────────────────────────────────────────

function IdeasBankView({
  ideas, onBack, onAdd, onDelete, onRequestSchedule, onWriteScript, isDesktop = false,
}: {
  ideas: Idea[];
  onBack: () => void;
  onAdd: (i: Idea) => void;
  onDelete: (id: string) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
  /** Opens the full-screen script writer pre-filled from this idea; the
   *  saved script lands in My Scripts, same as writing from an Inspire ref. */
  onWriteScript?: (idea: Idea) => void;
  /** Desktop modal: labeled tabs + wider grid instead of the phone layout */
  isDesktop?: boolean;
}) {
  const [tab,          setTab]          = useState<IdeaCategory>("meme");
  const [showForm,     setShowForm]     = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [title,        setTitle]        = useState("");
  const [notes,        setNotes]        = useState("");
  const [url,          setUrl]          = useState("");

  const filtered = ideas.filter((i) => i.category === tab);

  function submit() {
    const t = title.trim();
    if (!t) return;
    const idea: Idea = { id: uid(), category: tab, title: t, notes: notes.trim() || undefined, url: url.trim() || undefined, createdAt: Date.now() };
    onAdd(idea);
    setTitle(""); setNotes(""); setUrl("");
    setShowForm(false);
    onRequestSchedule?.(idea.title, idea.notes || undefined);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4">
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content</p>
          <h1 className="text-2xl font-bold text-white">Quick Ideas</h1>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-black"
        >
          <Plus className="h-3.5 w-3.5" /> New idea
        </button>
      </div>

      {/* Tabs — the icon-only-until-active trick is a phone space hack;
          on desktop every tab shows its label, always. */}
      {isDesktop ? (
        <div className="flex gap-1">
          {IDEA_CATEGORIES.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => { setTab(id); setSchedulingId(null); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${
                  active ? "bg-accent text-black" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          {IDEA_CATEGORIES.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                onClick={() => { setTab(id); setSchedulingId(null); }}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all duration-200 ${
                  active
                    ? "bg-accent text-black px-3 flex-shrink-0"
                    : "text-zinc-500 hover:text-zinc-300 flex-1"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {active && <span className="whitespace-nowrap">{label}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">
            New {IDEA_CATEGORIES.find((c) => c.id === tab)?.label.slice(0, -1)}
          </p>
          <input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title or idea..."
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-accent"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition">Cancel</button>
            <button onClick={submit} className="flex items-center gap-1 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-black">
              <Check className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      {/* Ideas list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Lightbulb className="h-8 w-8 text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">No {IDEA_CATEGORIES.find((c) => c.id === tab)?.label.toLowerCase()} yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Hit "New idea" to add one.</p>
        </div>
      ) : (
        <div className={`grid gap-3 sm:grid-cols-2 ${isDesktop ? "lg:grid-cols-3" : ""}`}>
          {filtered.map((idea) => (
            // min-w-0: without it, a grid item won't shrink below its content's
            // intrinsic width — a long unbroken URL blew the card (and the
            // whole page) out sideways, forcing horizontal scroll. `truncate`
            // on the link below only works once the ancestor can actually shrink.
            <div key={idea.id} className="group min-w-0 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-white leading-snug">{idea.title}</p>
                <button
                  onClick={() => onDelete(idea.id)}
                  className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition flex-shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {idea.notes && <p className="text-xs text-zinc-400 leading-relaxed">{idea.notes}</p>}
              {idea.url && (
                <a
                  href={idea.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate text-xs text-accent hover:underline"
                >
                  {idea.url}
                </a>
              )}

              {/* Schedule + write-script actions */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { onRequestSchedule?.(idea.title, idea.notes || undefined); setSchedulingId(null); }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-accent/40 hover:text-accent transition"
                >
                  <Calendar className="h-3 w-3" /> Add to calendar
                </button>
                {onWriteScript && (
                  <button
                    onClick={() => onWriteScript(idea)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-accent/40 hover:text-accent transition"
                  >
                    <Pencil className="h-3 w-3" /> Write script
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scripts (tap-to-select + bottom sheet) ───────────────────────────────────

function ScriptsView({
  briefs, onBack, onAdd, onDelete, onRequestSchedule, onOpenDetail, videoRef, isDesktop = false,
}: {
  briefs: Brief[];
  onBack: () => void;
  onAdd: (b: Brief) => void;
  onDelete: (id: string) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
  onOpenDetail: (brief: Brief) => void;
  videoRef?: VideoRef | null;
  /** Desktop modal: inline compose form + 2-col list instead of phone layout */
  isDesktop?: boolean;
}) {
  // Default to the list of what's already there — "Create" is the empty
  // action, most visits are to check/open an existing script (Paco, 2026-07-13).
  const [tab,       setTab]       = useState<"create" | "list">("list");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fTitle,    setFTitle]    = useState(videoRef ? `My take: ${videoRef.title.slice(0, 60)}` : "");
  const [fScript,   setFScript]   = useState("");

  const { sheetRef: composeSheetRef, dismiss: dismissComposeSheet } = useSheetDismiss(closeSheet);

  function closeSheet() {
    setSheetOpen(false);
    setFTitle("");
    setFScript("");
  }

  function submitBrief() {
    if (!fTitle.trim()) return;
    const brief: Brief = {
      id: uid(),
      formatId: "", formatName: "", formatColor: "",
      lineId: "",   lineName: "",
      title: fTitle.trim(),
      script: fScript.trim(),
      refUrl: videoRef?.url || undefined,
      createdAt: Date.now(),
    };
    onAdd(brief);
    onRequestSchedule?.(brief.title, brief.script || undefined);
    closeSheet();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content</p>
          <h1 className="text-2xl font-bold text-white">Content Generator</h1>
        </div>
      </div>

      {/* Tab switcher — My Scripts first: that's what most visits are for.
          Desktop: inline auto-width tabs; the full-width phone pill bar
          stretched across the modal read as mobile UI. */}
      {isDesktop ? (
        <div className="flex gap-1">
          <button
            onClick={() => setTab("list")}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${tab === "list" ? "bg-accent text-black" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
          >
            My Scripts {briefs.length > 0 && `(${briefs.length})`}
          </button>
          <button
            onClick={() => setTab("create")}
            className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition ${tab === "create" ? "bg-accent text-black" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200"}`}
          >
            Create
          </button>
        </div>
      ) : (
        <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setTab("list")}
            className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${tab === "list" ? "bg-accent text-black" : "text-zinc-400 hover:text-white"}`}
          >
            My Scripts {briefs.length > 0 && `(${briefs.length})`}
          </button>
          <button
            onClick={() => setTab("create")}
            className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${tab === "create" ? "bg-accent text-black" : "text-zinc-400 hover:text-white"}`}
          >
            Create
          </button>
        </div>
      )}

      {/* CREATE tab — desktop writes inline (no ceremony between you and
          the form); mobile keeps the CTA that opens the compose sheet */}
      {tab === "create" && (
        isDesktop ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            {videoRef && (
              <div className="space-y-1 rounded-xl border border-purple-400/20 bg-purple-400/5 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">Inspire Reference</p>
                <p className="text-sm font-medium text-white line-clamp-2">{videoRef.title}</p>
              </div>
            )}
            <input
              autoFocus
              type="text"
              value={fTitle}
              onChange={(e) => setFTitle(e.target.value)}
              placeholder="Title or hook for this piece..."
              className="h-11 w-full rounded-xl border border-white/15 bg-black/30 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
            <textarea
              value={fScript}
              onChange={(e) => setFScript(e.target.value)}
              placeholder="Write your script, idea, or execution notes..."
              rows={7}
              className="w-full resize-none rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setFTitle(""); setFScript(""); setTab("list"); }} className="rounded-xl border border-white/10 px-4 py-2 text-xs text-zinc-400 transition hover:text-white">
                Cancel
              </button>
              <button onClick={submitBrief} disabled={!fTitle.trim()} className="rounded-xl bg-accent px-5 py-2 text-xs font-bold text-black disabled:opacity-40">
                Save script
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <Sparkles className="h-8 w-8 text-accent/60" />
            <div className="space-y-1">
              <p className="text-white font-semibold">Ready to write?</p>
              <p className="text-xs text-zinc-500">Tap below to create a new script brief.</p>
            </div>
            <button
              onClick={() => setSheetOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-black"
            >
              <Plus className="h-4 w-4" /> New Script
            </button>
          </div>
        )
      )}

      {/* MY SCRIPTS tab */}
      {tab === "list" && (
        <div className={isDesktop ? "grid grid-cols-2 items-start gap-3" : "space-y-3"}>
          {briefs.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 text-center ${isDesktop ? "col-span-2" : ""}`}>
              <Pencil className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">No scripts yet.</p>
              <p className="text-zinc-600 text-xs mt-1">Go to Create and pick a format + line to start.</p>
              <button onClick={() => setTab("create")} className="mt-4 text-xs text-accent hover:underline">
                Go to Create →
              </button>
            </div>
          ) : briefs.map((brief) => (
            <button
              key={brief.id}
              onClick={() => onOpenDetail(brief)}
              className="group w-full text-left rounded-2xl border border-white/10 bg-white/5 overflow-hidden hover:border-white/20 transition-colors"
            >
              <div className="h-1.5 w-full" style={{ backgroundColor: brief.formatColor }} />
              <div className="p-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-medium text-black" style={{ backgroundColor: brief.formatColor }}>
                    {brief.formatName}
                  </span>
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-zinc-400">
                    {brief.lineName}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white leading-snug">{brief.title}</p>
                {brief.script && (
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 whitespace-pre-line">{brief.script}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Bottom sheet backdrop — mobile only; desktop composes inline */}
      {!isDesktop && sheetOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={dismissComposeSheet}
        />
      )}

      {/* Bottom sheet — bounded + scrollable (own overflow-y-auto): SHEET_BOTTOM
          shifts the whole sheet above the keyboard, but on the timing edge
          cases where it lags the keyboard animation, an un-scrollable sheet
          left the script textarea + Save button unreachable below the title
          field ("no sale el lugar para escribir", Paco 2026-07-13). Now the
          content can always be reached by scrolling within the sheet.
          Mobile only — desktop's Create tab renders the form inline. */}
      {!isDesktop && <div
        ref={composeSheetRef}
        className={`fixed left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-zinc-950 px-5 pt-4 pb-8 shadow-2xl transition-transform duration-300 ease-out ${
        sheetOpen ? "translate-y-0" : "translate-y-full"
      }`}
        style={{ bottom: SHEET_BOTTOM }}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />

        <div className="space-y-3">
          {videoRef && (
            <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-3 space-y-1 mb-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">Inspire Reference</p>
              <p className="text-sm text-white font-medium line-clamp-2">{videoRef.title}</p>
              <p className="text-xs text-zinc-400 line-clamp-2">💡 {videoRef.angle}</p>
            </div>
          )}
          <input
            autoFocus={sheetOpen}
            type="text"
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
            placeholder="Title or hook for this piece..."
            className="w-full h-11 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
          />
          <textarea
            value={fScript}
            onChange={(e) => setFScript(e.target.value)}
            placeholder="Write your script, idea, or execution notes..."
            rows={4}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none resize-none placeholder:text-zinc-500 focus:border-accent"
          />
          <div className="flex gap-2">
            <button onClick={closeSheet} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm text-zinc-400 hover:text-white transition">
              Cancel
            </button>
            <button onClick={submitBrief} className="flex-1 rounded-2xl bg-accent py-3 text-sm font-bold text-black">
              Save script
            </button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ─── Trending Ideas (Pro) ─────────────────────────────────────────────────────

type TrendingVideo = {
  id: string; title: string; channel: string; thumbnail: string;
  views: string; url: string; publishedAt: string;
  why: string; angle: string; tag: string; tagColor: string;
};

const CACHE_KEY    = "fennec-trending-ideas-v3";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

const LOADING_PHRASES = [
  "Scanning YouTube trends…",
  "Finding what's working this week…",
  "Analyzing music production content…",
  "Almost there…",
];

function LoadingFeed() {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {/* Animated message */}
      <div className="flex flex-col items-center gap-3 py-6">
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-accent"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
        <p
          className="text-sm text-zinc-400 transition-opacity duration-500"
          key={phraseIdx}
          style={{ animation: "fadeIn 0.4s ease" }}
        >
          {LOADING_PHRASES[phraseIdx]}
        </p>
      </div>

      {/* Skeleton cards */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl bg-white/[0.03] p-4 space-y-3 animate-pulse">
          <div className="flex gap-3">
            <div className="h-20 w-32 rounded-xl bg-white/5 shrink-0" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-3 bg-white/5 rounded-full w-3/4" />
              <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
              <div className="h-2.5 bg-white/5 rounded-full w-1/3" />
            </div>
          </div>
          <div className="h-2.5 bg-white/5 rounded-full w-full" />
          <div className="h-2.5 bg-white/5 rounded-full w-4/5" />
        </div>
      ))}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
      `}</style>
    </div>
  );
}

function TrendingView({ isPro, onBack, onUseAsReference, onRequestSchedule, onUpgrade, genres = [], isDesktop = false }: {
  /** Desktop modal: 2-col video grid instead of the phone's single stack */
  isDesktop?: boolean;
  isPro: boolean;
  onBack: () => void;
  onUseAsReference?: (video: VideoRef) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
  onUpgrade?: () => void;
  /** The user's genres from their profile — the API rewrites each video's
   *  "Your angle" for these instead of serving the generic one. */
  genres?: string[];
}) {
  const [videos,  setVideos]  = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  // Cache key includes the genre combo: changing genres in Settings must
  // not serve angles personalized for the old ones.
  const genreSlug = [...genres].sort().join(",").toLowerCase();
  const cacheKey  = genreSlug ? `${CACHE_KEY}:${genreSlug}` : CACHE_KEY;

  useEffect(() => {
    if (!isPro) return;
    // Check cache
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { videos: v, cachedAt } = JSON.parse(cached);
        if (Date.now() - cachedAt < CACHE_TTL_MS) {
          setVideos(v);
          setLastFetch(cachedAt);
          return;
        }
      }
    } catch {}
    fetchFeed();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, genreSlug]);

  async function fetchFeed() {
    setLoading(true);
    setError(null);
    try {
      const qs   = genres.length ? `?genres=${encodeURIComponent(genres.join(","))}` : "";
      const { data: { session } } = await supabase.auth.getSession();
      const res  = await fetch(`/api/trending-ideas${qs}`, {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.videos?.length) throw new Error("No videos returned");
      setVideos(data.videos);
      setLastFetch(data.cachedAt);
      // Only cache when we actually have results — never cache empty responses
      localStorage.setItem(cacheKey, JSON.stringify({ videos: data.videos, cachedAt: data.cachedAt }));
    } catch (e) {
      setError("Could not load trending ideas. Try again later.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const lastFetchLabel = lastFetch
    ? new Date(lastFetch).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content · Pro</p>
          <h1 className="text-2xl font-bold text-white">Daily Ideas</h1>
        </div>
        {isPro && lastFetchLabel && !loading && (
          <span className="ml-auto text-[10px] text-zinc-600">
            Updated {lastFetchLabel}
          </span>
        )}
      </div>

      {/* Pro gate */}
      {!isPro ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent/30 bg-accent/5 px-8 py-12 text-center">
          <Lock className="h-8 w-8 text-accent" />
          <div>
            <p className="font-semibold text-white">Upgrade to Pro</p>
            <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
              Get a daily feed of trending YouTube videos in the music production niche — analyzed by AI so you know exactly why they work and how to adapt them.
            </p>
          </div>
          {/* Price lives in the upgrade sheet — a hardcoded one here went stale ($9.99) */}
          <button onClick={onUpgrade} className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-black hover:brightness-110 active:scale-[0.97] transition">
            Upgrade to Pro
          </button>
        </div>
      ) : loading ? (
        <LoadingFeed />
      ) : error ? (
        <div className="rounded-2xl border border-red-400/20 bg-red-400/5 p-6 text-center space-y-2">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={fetchFeed} className="text-xs text-accent hover:underline">Try again</button>
        </div>
      ) : videos.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-zinc-500 text-sm">No trending videos found. Check back tomorrow.</p>
        </div>
      ) : (
        <div className={isDesktop ? "grid grid-cols-2 items-start gap-4" : "space-y-4"}>
          {videos.map((v) => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">

              {/* Thumbnail + meta */}
              <div className="flex gap-0">
                <img
                  src={`/api/img-proxy?url=${encodeURIComponent(v.thumbnail)}`}
                  alt={v.title}
                  className="w-36 h-24 object-cover shrink-0"
                />
                <div className="flex-1 p-3 min-w-0 space-y-1">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${v.tagColor}`}>
                    {v.tag}
                  </span>
                  <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{v.title}</p>
                  <p className="text-[10px] text-zinc-600">{v.channel} · {v.views}</p>
                </div>
              </div>

              {/* Analysis */}
              <div className="px-4 pb-4 pt-3 space-y-3 border-t border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Why it works</p>
                  <p className="text-xs text-zinc-300 leading-relaxed">{v.why}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    Your angle{genres.length > 0 && ` · ${genres.slice(0, 2).join(" / ")}`}
                  </p>
                  <p className="text-xs text-accent leading-relaxed">{v.angle}</p>
                </div>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white transition"
                >
                  <SiYoutube className="h-3 w-3 text-red-500" />
                  Watch on YouTube
                </a>
                {/* Action buttons */}
                <div className="flex gap-2 pt-2 border-t border-white/5 mt-2">
                  <button
                    onClick={() => onUseAsReference?.({
                      title: v.title,
                      channel: v.channel,
                      angle: v.angle,
                      why: v.why,
                      url: v.url,
                      thumbnail: v.thumbnail,
                    })}
                    className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-xs font-semibold text-accent hover:bg-accent/20 transition"
                  >
                    ✨ Use as reference
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main module ──────────────────────────────────────────────────────────────

export default function ContentModule({ isPro = false, onUpgrade, genres = [] }: { isPro?: boolean; onUpgrade?: () => void; genres?: string[] }) {
  const [ideas,  setIdeas]  = useState<Idea[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const isDesktop = useIsDesktop();
  const [tasks,  setTasks]  = useState<ContentTask[]>([]);
  const [sheet,  setSheet]  = useState<ActiveSheet>("none");
  const [videoRef, setVideoRef] = useState<VideoRef | null>(null);
  const [scriptWriter, setScriptWriter] = useState<VideoRef | null>(null);
  // Which entry point opened the writer — Inspire ref / Lab-generated both
  // tag "inspire" (unchanged pre-existing behavior); a Quick Idea tags
  // "ideas" so the calendar chip and brief format reflect where it came from.
  const [scriptSource, setScriptSource] = useState<"inspire" | "ideas">("inspire");
  const [detailBrief, setDetailBrief]   = useState<Brief | null>(null);
  const [pendingTask, setPendingTask] = useState<{
    title: string; notes?: string; source: ContentTask["source"];
  } | null>(null);

  // isPro is received as a prop — Inspire & Music Content Lab are Pro features

  // ── Swipe-down to close sheet ──
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragY, setDragY] = useState(0);

  function onTouchStart(e: React.TouchEvent) {
    dragStartY.current = e.touches[0].clientY;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (dragStartY.current === null) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    if (dy > 0) setDragY(dy);
  }
  function onTouchEnd() {
    if (dragY > 100) closeSheet();
    setDragY(0);
    dragStartY.current = null;
  }

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDEAS_BANK_KEY);
      if (raw) setIdeas(JSON.parse(raw) as Idea[]);
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(BRIEFS_KEY);
      if (raw) setBriefs(JSON.parse(raw) as Brief[]);
    } catch { /* ignore */ }
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) setTasks(JSON.parse(raw) as ContentTask[]);
    } catch { /* ignore */ }
  }, []);

  // ── Persist ──
  useEffect(() => { localStorage.setItem(IDEAS_BANK_KEY, JSON.stringify(ideas));   }, [ideas]);
  useEffect(() => { localStorage.setItem(BRIEFS_KEY,     JSON.stringify(briefs));  }, [briefs]);
  useEffect(() => { localStorage.setItem(TASKS_KEY,      JSON.stringify(tasks));   }, [tasks]);

  // ── Task handlers ──
  function addTask(title: string, date: string, source: ContentTask["source"], notes?: string) {
    const t: ContentTask = {
      id: uid(), title, date, notes, source, status: "pending", createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, t]);
  }

  function toggleDone(id: string) {
    setTasks((prev) => prev.map((t) =>
      t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t
    ));
  }

  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Sheet handlers ──
  function openSheet(s: "inspire" | "ideas" | "scripts" | "lab") {
    setVideoRef(null);
    setSheet(s);
  }

  function closeSheet() {
    setSheet("none");
    setVideoRef(null);
    setPendingTask(null);
  }

  function requestSchedule(title: string, source: ContentTask["source"], notes?: string) {
    setPendingTask({ title, notes, source });
  }

  function confirmSchedule(date: string) {
    if (!pendingTask) return;
    addTask(pendingTask.title, date, pendingTask.source, pendingTask.notes);
    setPendingTask(null);
    closeSheet();
  }

  function useVideoAsReference(video: VideoRef) {
    setSheet("none"); // close the Inspire sheet
    setScriptSource("inspire");
    setScriptWriter(video); // open full-screen writer
  }

  /** Same full-screen writer, opened from a saved Quick Idea instead of an
   *  Inspire reference — the resulting script still lands in My Scripts. */
  function useIdeaAsReference(idea: Idea) {
    setSheet("none");
    setScriptSource("ideas");
    setScriptWriter({
      title: idea.title,
      channel: "",
      angle: idea.notes ?? "",
      why: "",
      url: idea.url ?? "",
      thumbnail: "",
    });
  }

  // Shared by both presentations of the tool overlay (mobile bottom sheet /
  // desktop centered modal) — ONE source of truth for the four tools.
  const sheetContent = (
    <>
      {sheet === "inspire" && (
        <TrendingView
          isPro={isPro}
          isDesktop={isDesktop}
          onBack={closeSheet}
          onUseAsReference={useVideoAsReference}
          onRequestSchedule={(title: string, notes?: string) => requestSchedule(title, "inspire", notes)}
          onUpgrade={onUpgrade}
          genres={genres}
        />
      )}
      {sheet === "ideas" && (
        <IdeasBankView
          ideas={ideas}
          isDesktop={isDesktop}
          onBack={closeSheet}
          onAdd={(i) => setIdeas((prev) => [i, ...prev])}
          onDelete={(id) => setIdeas((prev) => prev.filter((i) => i.id !== id))}
          onRequestSchedule={(title: string, notes?: string) => requestSchedule(title, "ideas", notes)}
          onWriteScript={useIdeaAsReference}
        />
      )}
      {sheet === "scripts" && (
        <ScriptsView
          briefs={briefs}
          videoRef={videoRef}
          isDesktop={isDesktop}
          onBack={closeSheet}
          onAdd={(b) => setBriefs((prev) => [b, ...prev])}
          onDelete={(id) => setBriefs((prev) => prev.filter((b) => b.id !== id))}
          onRequestSchedule={(title: string, notes?: string) => requestSchedule(title, "scripts", notes)}
          onOpenDetail={(brief) => { setSheet("none"); setDetailBrief(brief); }}
        />
      )}
      {sheet === "lab" && (
        <MusicContentLab
          onClose={() => setSheet("none")}
          onGenerateScript={(ref) => {
            setSheet("none");
            setScriptSource("inspire");
            setScriptWriter(ref);
          }}
        />
      )}
    </>
  );

  return (
    <div className={isDesktop ? "relative" : "relative flex-1 flex flex-col overflow-hidden"}>
      {isDesktop ? (
        // Desktop: the active tool takes over the whole content area as a
        // full page (with a Back link), not a floating bordered box. A modal
        // that leaves dead margins on a wide screen reads as a phone popup
        // (Paco, 2026-07-16) — Business-style in-module navigation instead.
        sheet !== "none" ? (
          <div className="fennec-dialog-in w-full">
            <button
              onClick={closeSheet}
              className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to calendar
            </button>
            {sheetContent}
          </div>
        ) : (
          <ContentHubDesktop
            tasks={tasks}
            isPro={isPro}
            onUpgrade={onUpgrade}
            onOpenSheet={openSheet}
            onToggleDone={toggleDone}
            onDeleteTask={deleteTask}
            ideasCount={ideas.length}
            scriptsCount={briefs.length}
            onAddTask={(title, date) => addTask(title, date, "manual")}
            onEditScript={(taskTitle) => {
              const brief = briefs.find((b) => b.title === taskTitle);
              if (brief) setDetailBrief(brief);
            }}
          />
        )
      ) : (
        <>
          {/* Mobile: week-strip hub + the active tool as a bottom sheet
              (sliding up from the bottom is a phone gesture). */}
          <CalendarHub
            tasks={tasks}
            isPro={isPro}
            onUpgrade={onUpgrade}
            onOpenSheet={openSheet}
            onToggleDone={toggleDone}
            onDeleteTask={deleteTask}
            onEditScript={(taskTitle) => {
              const brief = briefs.find((b) => b.title === taskTitle);
              if (brief) setDetailBrief(brief);
            }}
          />

          {sheet !== "none" && (
            <>
              <div
                className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
                onClick={closeSheet}
              />
              <div
                ref={sheetRef}
                className="fixed left-0 right-0 z-40 h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950 overflow-y-auto"
                style={{ transform: `translateY(${dragY}px)`, transition: dragY === 0 ? "transform 0.3s ease-out" : "none" }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              >
                {/* Drag handle */}
                <div className="sticky top-0 z-10 flex items-center justify-center px-4 pt-3 pb-2 bg-zinc-950">
                  <div className="w-10 h-1 rounded-full bg-white/30" />
                </div>
                <div className="px-2 pb-32 pt-1">{sheetContent}</div>
              </div>
            </>
          )}
        </>
      )}

      {/* Full-screen script detail view */}
      {detailBrief && (
        <ScriptDetailOverlay
          brief={detailBrief}
          onClose={() => setDetailBrief(null)}
          onDelete={(id) => { setBriefs((prev) => prev.filter((b) => b.id !== id)); setDetailBrief(null); }}
          onSchedule={(title, notes) => { setDetailBrief(null); requestSchedule(title, "scripts", notes); }}
          scheduledTask={tasks.find((t) => t.source === "scripts" && t.title === detailBrief.title) ?? null}
          onUpdate={(id, title, script, newDate) => {
            setBriefs((prev) => prev.map((b) => b.id === id ? { ...b, title, script } : b));
            setDetailBrief((prev) => prev ? { ...prev, title, script } : prev);
            if (newDate) {
              // Update existing task date, or create a new one
              const existing = tasks.find((t) => t.source === "scripts" && t.title === detailBrief.title);
              if (existing) {
                setTasks((prev) => prev.map((t) => t.id === existing.id ? { ...t, title, date: newDate } : t));
              } else {
                addTask(title, newDate, "scripts", script || undefined);
              }
            }
          }}
        />
      )}

      {/* Full-screen script writer — from an Inspire reference, a Lab
          generation, or a Quick Idea (scriptSource tracks which). */}
      {scriptWriter && (
        <ScriptWriterOverlay
          videoRef={scriptWriter}
          onClose={() => setScriptWriter(null)}
          onSave={(title, script) => {
            const isLabGenerated = !!scriptWriter?.channel && scriptWriter.channel !== "";
            const sourceLabel = scriptSource === "ideas" ? "Quick Idea" : "Inspire";
            const brief = {
              id: uid(),
              title,
              script,
              formatId: "",
              formatName: isLabGenerated ? scriptWriter!.channel : sourceLabel,
              formatColor: "#f5a623",
              lineId: "",
              lineName: isLabGenerated
                ? scriptWriter!.title.split(" — ").slice(1).join(" — ")
                : scriptWriter?.title ?? "",
              refUrl: scriptWriter?.url || undefined,
              createdAt: Date.now(),
            };
            setBriefs((prev) => [brief, ...prev]);
            setScriptWriter(null);
            requestSchedule(title, scriptSource, script || undefined);
          }}
        />
      )}

      {/* Schedule prompt */}
      {pendingTask && (
        <SchedulePrompt
          taskTitle={pendingTask.title}
          onConfirm={confirmSchedule}
          onSkip={() => { setPendingTask(null); closeSheet(); }}
        />
      )}
    </div>
  );
}
