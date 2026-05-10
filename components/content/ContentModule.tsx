"use client";

import { useState, useEffect } from "react";
import {
  Plus, Trash2, Pencil, Check, X,
  Lightbulb, Calendar, Sparkles, Lock,
  BookOpen, Smile, Quote, Music2, GraduationCap,
} from "lucide-react";
import {
  IDEAS_BANK_KEY, BRIEFS_KEY,
  type Idea, type IdeaCategory, type Brief,
} from "@/lib/contentData";
import CalendarHub from "./CalendarHub";
import SchedulePrompt from "./SchedulePrompt";

const TASKS_KEY = "fennec-content-tasks-v1";

type ActiveSheet = "none" | "inspire" | "ideas" | "scripts";

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
  url: string;
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
  ideas, onBack, onAdd, onDelete, onRequestSchedule,
}: {
  ideas: Idea[];
  onBack: () => void;
  onAdd: (i: Idea) => void;
  onDelete: (id: string) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
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
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2">
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

      {/* Tabs */}
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
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none resize-none placeholder:text-zinc-600 focus:border-accent"
          />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
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
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((idea) => (
            <div key={idea.id} className="group rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
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
                  className="text-xs text-accent hover:underline truncate block"
                >
                  {idea.url}
                </a>
              )}

              {/* Schedule button */}
              <button
                onClick={() => { onRequestSchedule?.(idea.title, idea.notes || undefined); setSchedulingId(null); }}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-accent/40 hover:text-accent transition"
              >
                <Calendar className="h-3 w-3" /> Add to calendar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scripts (tap-to-select + bottom sheet) ───────────────────────────────────

function ScriptsView({
  briefs, onBack, onAdd, onDelete, onRequestSchedule, videoRef,
}: {
  briefs: Brief[];
  onBack: () => void;
  onAdd: (b: Brief) => void;
  onDelete: (id: string) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
  videoRef?: VideoRef | null;
}) {
  const [tab,       setTab]       = useState<"create" | "list">("create");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fTitle,    setFTitle]    = useState(videoRef ? `My take: ${videoRef.title.slice(0, 60)}` : "");
  const [fScript,   setFScript]   = useState("");

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
      createdAt: Date.now(),
    };
    onAdd(brief);
    onRequestSchedule?.(brief.title, brief.script || undefined);
    closeSheet();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content</p>
          <h1 className="text-2xl font-bold text-white">Content Generator</h1>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button
          onClick={() => setTab("create")}
          className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${tab === "create" ? "bg-accent text-black" : "text-zinc-400 hover:text-white"}`}
        >
          Create
        </button>
        <button
          onClick={() => setTab("list")}
          className={`flex-1 rounded-xl py-2 text-xs font-medium transition ${tab === "list" ? "bg-accent text-black" : "text-zinc-400 hover:text-white"}`}
        >
          My Scripts {briefs.length > 0 && `(${briefs.length})`}
        </button>
      </div>

      {/* CREATE tab */}
      {tab === "create" && (
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
      )}

      {/* MY SCRIPTS tab */}
      {tab === "list" && (
        <div className="space-y-3">
          {briefs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Pencil className="h-8 w-8 text-zinc-700 mb-3" />
              <p className="text-zinc-500 text-sm">No scripts yet.</p>
              <p className="text-zinc-600 text-xs mt-1">Go to Create and pick a format + line to start.</p>
              <button onClick={() => setTab("create")} className="mt-4 text-xs text-accent hover:underline">
                Go to Create →
              </button>
            </div>
          ) : briefs.map((brief) => (
            <div key={brief.id} className="group rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
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
                  <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3 whitespace-pre-line">{brief.script}</p>
                )}
                <div className="flex items-center justify-end pt-1">
                  <button onClick={() => onDelete(brief.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom sheet backdrop */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={closeSheet}
        />
      )}

      {/* Bottom sheet */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-white/10 bg-zinc-950 px-5 pt-4 pb-8 shadow-2xl transition-transform duration-300 ease-out ${
        sheetOpen ? "translate-y-0" : "translate-y-full"
      }`}>
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
            className="w-full h-11 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
          />
          <textarea
            value={fScript}
            onChange={(e) => setFScript(e.target.value)}
            placeholder="Write your script, idea, or execution notes..."
            rows={4}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none resize-none placeholder:text-zinc-600 focus:border-accent"
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
      </div>
    </div>
  );
}

// ─── Trending Ideas (Pro) ─────────────────────────────────────────────────────

type TrendingVideo = {
  id: string; title: string; channel: string; thumbnail: string;
  views: string; url: string; publishedAt: string;
  why: string; angle: string; tag: string; tagColor: string;
};

const CACHE_KEY    = "fennec-trending-ideas-v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 horas

function TrendingView({ isPro, onBack, onUseAsReference, onRequestSchedule }: {
  isPro: boolean;
  onBack: () => void;
  onUseAsReference?: (video: { title: string; channel: string; angle: string; url: string }) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
}) {
  const [videos,  setVideos]  = useState<TrendingVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number | null>(null);

  useEffect(() => {
    if (!isPro) return;
    // Check cache
    try {
      const cached = localStorage.getItem(CACHE_KEY);
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
  }, [isPro]);

  async function fetchFeed() {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/trending-ideas");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.videos?.length) throw new Error("No videos returned");
      setVideos(data.videos);
      setLastFetch(data.cachedAt);
      // Only cache when we actually have results — never cache empty responses
      localStorage.setItem(CACHE_KEY, JSON.stringify({ videos: data.videos, cachedAt: data.cachedAt }));
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
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2">

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
          <button className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-black">
            Upgrade — $9.99/mo
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="h-20 w-32 rounded-xl bg-white/5 shrink-0" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 bg-white/5 rounded-full w-3/4" />
                  <div className="h-2.5 bg-white/5 rounded-full w-1/2" />
                </div>
              </div>
              <div className="h-2.5 bg-white/5 rounded-full w-full" />
              <div className="h-2.5 bg-white/5 rounded-full w-4/5" />
            </div>
          ))}
        </div>
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
        <div className="space-y-4">
          {videos.map((v) => (
            <div key={v.id} className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">

              {/* Thumbnail + meta */}
              <div className="flex gap-0">
                <img
                  src={v.thumbnail}
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
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Your angle</p>
                  <p className="text-xs text-accent leading-relaxed">{v.angle}</p>
                </div>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-white transition"
                >
                  Watch on YouTube →
                </a>
                {/* Action buttons */}
                <div className="flex gap-2 pt-2 border-t border-white/5 mt-2">
                  <button
                    onClick={() => onUseAsReference?.({
                      title: v.title,
                      channel: v.channel,
                      angle: v.angle,
                      url: v.url,
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

export default function ContentModule() {
  const [ideas,  setIdeas]  = useState<Idea[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [tasks,  setTasks]  = useState<ContentTask[]>([]);
  const [sheet,  setSheet]  = useState<ActiveSheet>("none");
  const [videoRef, setVideoRef] = useState<VideoRef | null>(null);
  const [pendingTask, setPendingTask] = useState<{
    title: string; notes?: string; source: ContentTask["source"];
  } | null>(null);

  const isPro = true;

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
  function openSheet(s: "inspire" | "ideas" | "scripts") {
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
    setVideoRef(video);
    setSheet("scripts");
  }

  return (
    <div className="relative">
      {/* Main calendar hub */}
      <CalendarHub
        tasks={tasks}
        onOpenSheet={openSheet}
        onToggleDone={toggleDone}
        onDeleteTask={deleteTask}
      />

      {/* Bottom sheet overlay */}
      {sheet !== "none" && (
        <>
          <div
            className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
            onClick={closeSheet}
          />
          <div className="fixed bottom-0 left-0 right-0 z-40 h-[92vh] rounded-t-3xl border-t border-white/10 bg-zinc-950 overflow-y-auto">
            {/* Drag handle only */}
            <div className="sticky top-0 z-10 flex items-center justify-center px-4 pt-3 pb-2 bg-zinc-950">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>
            <div className="px-2 pb-8 pt-1">
              {sheet === "inspire" && (
                <TrendingView
                  isPro={isPro}
                  onBack={closeSheet}
                  onUseAsReference={useVideoAsReference}
                  onRequestSchedule={(title: string, notes?: string) => requestSchedule(title, "inspire", notes)}
                />
              )}
              {sheet === "ideas" && (
                <IdeasBankView
                  ideas={ideas}
                  onBack={closeSheet}
                  onAdd={(i) => setIdeas((prev) => [i, ...prev])}
                  onDelete={(id) => setIdeas((prev) => prev.filter((i) => i.id !== id))}
                  onRequestSchedule={(title: string, notes?: string) => requestSchedule(title, "ideas", notes)}
                />
              )}
              {sheet === "scripts" && (
                <ScriptsView
                  briefs={briefs}
                  videoRef={videoRef}
                  onBack={closeSheet}
                  onAdd={(b) => setBriefs((prev) => [b, ...prev])}
                  onDelete={(id) => setBriefs((prev) => prev.filter((b) => b.id !== id))}
                  onRequestSchedule={(title: string, notes?: string) => requestSchedule(title, "scripts", notes)}
                />
              )}
            </div>
          </div>
        </>
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
