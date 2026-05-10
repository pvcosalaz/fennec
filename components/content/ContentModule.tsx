"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ArrowRight, Plus, Trash2, Pencil, Check, X,
  Lightbulb, Calendar, Layers, Sparkles, Lock, Flame,
  ChevronLeft, ChevronRight, BookOpen, Smile, Quote, Music2, GraduationCap,
} from "lucide-react";
import {
  CONTENT_LINES_KEY, CONTENT_FORMATS_KEY, IDEAS_BANK_KEY, POSTS_KEY, BRIEFS_KEY,
  DEFAULT_LINES, DEFAULT_FORMATS, DEFAULT_BRIEFS, TRENDING_IDEAS,
  type ContentLine, type ContentFormat, type Idea, type IdeaCategory, type Post, type PostStatus, type Brief,
} from "@/lib/contentData";

type ContentView = "hub" | "setup" | "scripts" | "ideas" | "calendar" | "trending";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toYMD(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseYMD(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_LABEL: Record<PostStatus, string> = {
  pending: "Pending",
  produced: "Produced",
  published: "Published",
};

const STATUS_COLOR: Record<PostStatus, string> = {
  pending:  "bg-zinc-700 text-zinc-300",
  produced: "bg-amber-400/20 text-amber-400",
  published:"bg-emerald-400/20 text-emerald-400",
};

const IDEA_CATEGORIES: { id: IdeaCategory; label: string; icon: React.ComponentType<{className?:string}> }[] = [
  { id: "music-ideas", label: "Music Ideas",  icon: Music2         },
  { id: "meme",        label: "Memes",        icon: Smile          },
  { id: "frase",       label: "Quotes",       icon: Quote          },
  { id: "tutoriales",  label: "Tutorials",    icon: GraduationCap  },
  { id: "referencia",  label: "References",   icon: BookOpen       },
];

const FORMAT_COLORS = [
  "#6bcb77","#ffd93d","#4d96ff","#ff9f43","#c77dff",
  "#ff6b6b","#ee5a24","#0abde3","#48dbfb","#ff9ff3",
];

// ─── Pulse stats ──────────────────────────────────────────────────────────────

const MONTHLY_TARGET = 12; // posts/month default goal

function postsInCurrentMonth(posts: Post[]): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return posts.filter((p) => p.status === "published" && p.date.startsWith(prefix)).length;
}

function publishingStreak(posts: Post[]): number {
  const published = new Set(
    posts.filter((p) => p.status === "published").map((p) => p.date),
  );
  if (published.size === 0) return 0;
  const cur = new Date();
  // Grace period: if today has no post but yesterday does, start from yesterday
  if (!published.has(toYMD(cur))) cur.setDate(cur.getDate() - 1);
  let streak = 0;
  while (published.has(toYMD(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

function lastNDays(n: number): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    return d;
  });
}

// ─── Hub ──────────────────────────────────────────────────────────────────────

const FAKE_SCRIPTS = [
  { format: "Reel", color: "#6bcb77",  line: "Behind the Scenes", title: "How I built this chord progression from scratch" },
  { format: "Podcast", color: "#ffd93d", line: "Tips & Tricks",    title: "3 mixing mistakes that are killing your sound" },
  { format: "YouTube", color: "#4d96ff", line: "Storytime",         title: "The session that changed everything for me" },
];

const FAKE_TRENDING = [
  { tag: "🔥 Trending", color: "bg-red-500/20 text-red-400",    ch: "In The Lab",    views: "2.1M views", title: "This one chord trick went viral on TikTok" },
  { tag: "⚡ Rising",   color: "bg-amber-500/20 text-amber-400", ch: "Studio Diaries", views: "890K views", title: "My honest studio setup tour (under $500)" },
  { tag: "💡 Insight",  color: "bg-blue-500/20 text-blue-400",   ch: "Sync Money",    views: "1.4M views", title: "From bedroom beat to Netflix — my story" },
];

// ── Beat grid heatmap (last 28 days) ─────────────────────────────────────────

function BeatGrid({ posts }: { posts: Post[] }) {
  const days = lastNDays(28);
  const published = new Set(
    posts.filter((p) => p.status === "published").map((p) => p.date),
  );
  const todayStr = toYMD(new Date());
  // Group into 4 rows of 7 (oldest → newest)
  const rows = Array.from({ length: 4 }, (_, r) => days.slice(r * 7, r * 7 + 7));

  return (
    <div className="space-y-1.5">
      {rows.map((row, r) => (
        <div key={r} className="flex gap-1.5">
          {row.map((d, i) => {
            const ymd = toYMD(d);
            const has = published.has(ymd);
            const isToday = ymd === todayStr;
            return (
              <div
                key={i}
                className="flex-1 aspect-square rounded-md transition"
                style={{
                  backgroundColor: has
                    ? "rgba(245,166,35,0.85)"
                    : "rgba(255,255,255,0.05)",
                  boxShadow: has ? "0 0 6px rgba(245,166,35,0.4)" : "none",
                  border: isToday ? "1px solid rgba(245,166,35,0.6)" : "none",
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Hub ──────────────────────────────────────────────────────────────────────

function HubView({ onNavigate, posts, ideas, briefs, isPro }: {
  onNavigate: (v: ContentView) => void;
  posts: Post[];
  ideas: Idea[];
  briefs: Brief[];
  isPro: boolean;
}) {
  const [tab, setTab] = useState<"pulse" | "studio">("pulse");

  const todayStr = toYMD(new Date());
  const upcoming = posts
    .filter((p) => p.date >= todayStr && p.status !== "published")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  // Pulse stats
  const monthCount = postsInCurrentMonth(posts);
  const targetPct  = Math.min((monthCount / MONTHLY_TARGET) * 100, 100);
  const streak     = publishingStreak(posts);

  // Today's focus — smart priority
  const todayPosts = posts.filter((p) => p.date === todayStr && p.status !== "published");
  const focus: { icon: typeof Calendar; title: string; sub: string; view: ContentView } = (() => {
    if (todayPosts.length > 0) {
      return {
        icon: Calendar,
        title: todayPosts[0].title,
        sub: `Scheduled for today · ${todayPosts[0].formatName}`,
        view: "calendar" as ContentView,
      };
    }
    if (briefs.length > 0 && upcoming.length === 0) {
      return {
        icon: Pencil,
        title: `${briefs.length} script${briefs.length > 1 ? "s" : ""} ready to schedule`,
        sub: "Lock in dates and stay on rhythm",
        view: "scripts" as ContentView,
      };
    }
    if (ideas.length > 0) {
      return {
        icon: Lightbulb,
        title: `${ideas.length} idea${ideas.length > 1 ? "s" : ""} waiting for a script`,
        sub: "Turn your captures into content",
        view: "ideas" as ContentView,
      };
    }
    return {
      icon: Sparkles,
      title: "Capture your next idea",
      sub: "The best content starts with a spark",
      view: "ideas" as ContentView,
    };
  })();
  const FocusIcon = focus.icon;

  // Studio workflow steps
  const workflow: {
    step: number;
    view: ContentView;
    icon: typeof Calendar;
    name: string;
    desc: string;
    pro: boolean;
  }[] = [
    { step: 1, view: "trending", icon: Sparkles,  name: "Inspire",  desc: "What's trending right now in music production.", pro: true  },
    { step: 2, view: "ideas",    icon: Lightbulb, name: "Capture",  desc: "Save your ideas the moment they hit.",            pro: false },
    { step: 3, view: "scripts",  icon: Pencil,    name: "Write",    desc: "Turn an idea into a ready-to-record script.",     pro: true  },
    { step: 4, view: "calendar", icon: Calendar,  name: "Schedule", desc: "Lock the date and stay on rhythm.",               pro: false },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl -mt-6">

      {/* Header */}
      <div className="px-2 pt-2 pb-4 space-y-1">
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Stay on rhythm.</h1>
        <p className="text-sm text-zinc-400">Capture, write, and schedule your content.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-white/10 mt-1 mb-6">
        <button
          onClick={() => setTab("pulse")}
          className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold transition-all relative ${
            tab === "pulse" ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Pulse
          {tab === "pulse" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-amber-500" />
          )}
        </button>
        <button
          onClick={() => setTab("studio")}
          className={`flex flex-1 items-center justify-center py-3.5 text-sm font-semibold transition-all relative ${
            tab === "studio" ? "text-white" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
          }`}
        >
          Studio
          {tab === "studio" && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[3px] rounded-full bg-amber-500" />
          )}
        </button>
      </div>

      <div className="px-2 space-y-6">

      {/* ── PULSE tab ────────────────────────────────────────────────────── */}
      {tab === "pulse" && (<>

        {/* Monthly cadence */}
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Posts this month</p>
              <p className="text-3xl font-black tracking-tighter text-white mt-1 tabular-nums">
                {monthCount}<span className="text-zinc-700 text-xl"> / {MONTHLY_TARGET}</span>
              </p>
            </div>
            {streak > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-3 py-1.5">
                <Flame className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">{streak}-day streak</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-zinc-700">
              <span>Target {MONTHLY_TARGET} / month</span>
              <span>{Math.round(targetPct)}%</span>
            </div>
            <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${targetPct}%` }} />
            </div>
          </div>
        </div>

        {/* Beat grid (heatmap) */}
        <div className="pt-2 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Last 4 weeks</p>
            <p className="text-[10px] text-zinc-700">Each box = 1 day</p>
          </div>
          <BeatGrid posts={posts} />
        </div>

        {/* Today's focus */}
        <button
          onClick={() => onNavigate(focus.view)}
          className="w-full text-left rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-transparent p-4 hover:border-amber-500/40 transition"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400/80 mb-2">Today's focus</p>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 shrink-0">
              <FocusIcon className="h-5 w-5 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{focus.title}</p>
              <p className="text-[11px] text-zinc-500 truncate">{focus.sub}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-amber-400 shrink-0" />
          </div>
        </button>

        {/* Upcoming */}
        <div className="pt-2 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Upcoming</p>
            <button onClick={() => onNavigate("calendar")} className="text-[10px] text-accent hover:underline">See all →</button>
          </div>
          {upcoming.length > 0 ? (
            <div className="space-y-1">
              {upcoming.map((post) => (
                <button
                  key={post.id}
                  onClick={() => onNavigate("calendar")}
                  className="w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/5 transition"
                >
                  <div className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: post.formatColor }} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-xs font-semibold text-white truncate">{post.title}</p>
                    <p className="text-[10px] text-zinc-600 truncate">{post.formatName} · {post.lineName}</p>
                  </div>
                  <span className="text-[10px] text-zinc-600 shrink-0">
                    {parseYMD(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-600 text-center py-6">Nothing scheduled. Tap "Studio" to plan your next post.</p>
          )}
        </div>
      </>)}

      {/* ── STUDIO tab — workflow ────────────────────────────────────────── */}
      {tab === "studio" && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 pb-2">Your content flow</p>

          {workflow.map((tool, idx) => {
            const isLocked = tool.pro && !isPro;
            const Icon = tool.icon;
            return (
              <div key={tool.step}>
                <div className="rounded-2xl border border-white/10 overflow-hidden relative">
                  <div className={isLocked ? "select-none pointer-events-none" : ""}>
                    <button
                      onClick={() => !isLocked && onNavigate(tool.view)}
                      disabled={isLocked}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition disabled:cursor-default"
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                        isLocked ? "bg-white/10 text-zinc-400" : "bg-accent text-black"
                      }`}>{tool.step}</span>
                      <Icon className={`h-4 w-4 shrink-0 ${isLocked ? "text-zinc-600" : "text-accent"}`} />
                      <div className="flex-1 text-left">
                        <p className="text-sm font-semibold text-white">{tool.name}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{tool.desc}</p>
                      </div>
                      {!isLocked && (
                        <ArrowRight className="h-4 w-4 text-zinc-600 shrink-0" />
                      )}
                    </button>

                    {/* Locked previews — only for free tier */}
                    {isLocked && tool.view === "scripts" && (
                      <div className="px-4 pb-3 space-y-1.5" style={{ filter: "blur(1.5px)", opacity: 0.8 }}>
                        {FAKE_SCRIPTS.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
                            <div className="h-5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] text-zinc-400 truncate">{s.format} × {s.line}</p>
                              <p className="text-xs font-medium text-white truncate">{s.title}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isLocked && tool.view === "trending" && (
                      <div className="px-4 pb-3 space-y-1.5" style={{ filter: "blur(1.5px)", opacity: 0.8 }}>
                        {FAKE_TRENDING.map((v, i) => (
                          <div key={i} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2">
                            <div className="w-10 h-7 rounded-md bg-zinc-800 shrink-0 flex items-center justify-center">
                              <Sparkles className="h-3 w-3 text-zinc-600" />
                            </div>
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <span className={`inline-block rounded-full px-1.5 py-px text-[9px] font-semibold ${v.color}`}>{v.tag}</span>
                              <p className="text-xs font-medium text-white truncate leading-tight">{v.title}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Lock overlay */}
                  {isLocked && (
                    <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                      <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 transition text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg shadow-amber-500/30">
                        <Lock className="h-3 w-3" /> Unlock Pro — $9.99/mo
                      </button>
                    </div>
                  )}
                </div>

                {idx < workflow.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-px h-4 bg-white/10" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      </div>
    </div>
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

function SetupView({
  lines, formats, onBack,
  onAddLine, onDeleteLine, onAddFormat, onDeleteFormat,
}: {
  lines: ContentLine[];
  formats: ContentFormat[];
  onBack: () => void;
  onAddLine: (l: ContentLine) => void;
  onDeleteLine: (id: string) => void;
  onAddFormat: (f: ContentFormat) => void;
  onDeleteFormat: (id: string) => void;
}) {
  const [newLine,        setNewLine]        = useState("");
  const [newFormat,      setNewFormat]      = useState("");
  const [newFormatColor, setNewFormatColor] = useState(FORMAT_COLORS[0]);

  function submitLine() {
    const name = newLine.trim();
    if (!name) return;
    onAddLine({ id: uid(), name });
    setNewLine("");
  }

  function submitFormat() {
    const name = newFormat.trim();
    if (!name) return;
    onAddFormat({ id: uid(), name, color: newFormatColor });
    setNewFormat("");
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content</p>
          <h1 className="text-2xl font-bold text-white">Formats & Lines</h1>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Formats — color-coded (top / left) */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-white">Formats</h2>
            <p className="text-xs text-zinc-400 mt-0.5">How you present the content — color-coded.</p>
          </div>

          <div className="space-y-2">
            {formats.map((fmt) => (
              <div
                key={fmt.id}
                className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-6 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: fmt.color }} />
                  <span className="text-sm text-zinc-200">{fmt.name}</span>
                  {fmt.isDefault && (
                    <span className="text-[10px] text-zinc-500">default</span>
                  )}
                </div>
                {!fmt.isDefault && (
                  <button onClick={() => onDeleteFormat(fmt.id)} className="text-zinc-600 hover:text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add format */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <p className="text-xs text-zinc-500">Add a format</p>
            <input
              type="text"
              value={newFormat}
              onChange={(e) => setNewFormat(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitFormat()}
              placeholder="e.g. Podcast clip"
              className="w-full h-9 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
            />
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-wrap">
                {FORMAT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewFormatColor(c)}
                    className="h-5 w-5 rounded-full transition"
                    style={{
                      backgroundColor: c,
                      outline: newFormatColor === c ? `2px solid ${c}` : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
              <button
                onClick={submitFormat}
                className="ml-auto flex items-center gap-1 rounded-xl bg-accent px-3 py-1.5 text-xs font-semibold text-black"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>
        </div>

        {/* Content Lines — plain text */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <div>
            <h2 className="font-semibold text-white">Content Lines</h2>
            <p className="text-xs text-zinc-400 mt-0.5">What you talk about — the hook or topic.</p>
          </div>

          <div className="space-y-2">
            {lines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between rounded-xl bg-black/30 px-3 py-2.5"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-zinc-200">{line.name}</span>
                  {line.isDefault && (
                    <span className="text-[10px] text-zinc-500">default</span>
                  )}
                </div>
                {!line.isDefault && (
                  <button onClick={() => onDeleteLine(line.id)} className="text-zinc-600 hover:text-red-400 transition">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add line */}
          <div className="space-y-2 pt-1 border-t border-white/5">
            <p className="text-xs text-zinc-500">Add a line</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLine}
                onChange={(e) => setNewLine(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitLine()}
                placeholder="e.g. Studio vlogs"
                className="flex-1 h-9 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
              />
              <button
                onClick={submitLine}
                className="flex items-center gap-1 rounded-xl bg-accent px-3 text-xs font-semibold text-black"
              >
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ideas Bank ───────────────────────────────────────────────────────────────

function ScheduleMiniForm({
  idea, lines, formats, onSchedule, onClose,
}: {
  idea: Idea;
  lines: ContentLine[];
  formats: ContentFormat[];
  onSchedule: (p: Post) => void;
  onClose: () => void;
}) {
  const [fDate, setFDate] = useState(toYMD(new Date()));
  const [done,  setDone]  = useState(false);

  function submit() {
    if (!fDate) return;
    const line   = lines[0];
    const format = formats[0];
    onSchedule({
      id: uid(),
      lineId:      line?.id ?? "",    lineName:    line?.name ?? "",
      formatId:    format?.id ?? "",  formatName:  format?.name ?? "",
      formatColor: format?.color ?? "#6bcb77",
      title: idea.title,
      notes: idea.notes,
      date: fDate,
      status: "pending",
      createdAt: Date.now(),
    });
    setDone(true);
    setTimeout(onClose, 1200);
  }

  if (done) return (
    <div className="flex items-center gap-2 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs text-emerald-400">
      <Check className="h-3.5 w-3.5" /> Added to calendar!
    </div>
  );

  return (
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/40 px-3 py-2">
      <input
        type="date"
        value={fDate}
        onChange={(e) => setFDate(e.target.value)}
        className="flex-1 h-8 rounded-lg border border-white/10 bg-transparent px-2 text-xs text-white outline-none focus:border-accent [color-scheme:dark]"
      />
      <button onClick={onClose} className="text-xs text-zinc-500 hover:text-white transition px-1">
        Cancel
      </button>
      <button onClick={submit} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black whitespace-nowrap">
        Add to calendar
      </button>
    </div>
  );
}

function IdeasBankView({
  ideas, lines, formats, onBack, onAdd, onDelete, onAddPost,
}: {
  ideas: Idea[];
  lines: ContentLine[];
  formats: ContentFormat[];
  onBack: () => void;
  onAdd: (idea: Idea) => void;
  onDelete: (id: string) => void;
  onAddPost: (p: Post) => void;
}) {
  const [tab,          setTab]          = useState<IdeaCategory>("meme");
  const [showForm,     setShowForm]     = useState(false);
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [title,        setTitle]        = useState("");
  const [notes,        setNotes]        = useState("");
  const [url,          setUrl]          = useState("");

  // Post-save schedule prompt
  const [savedIdea,      setSavedIdea]      = useState<Idea | null>(null);
  const [ideaSchedDate,  setIdeaSchedDate]  = useState(toYMD(new Date()));
  const [ideaSchedDone,  setIdeaSchedDone]  = useState(false);

  const filtered = ideas.filter((i) => i.category === tab);

  function submit() {
    const t = title.trim();
    if (!t) return;
    const idea: Idea = { id: uid(), category: tab, title: t, notes: notes.trim() || undefined, url: url.trim() || undefined, createdAt: Date.now() };
    onAdd(idea);
    setTitle(""); setNotes(""); setUrl("");
    setSavedIdea(idea); // → muestra prompt de calendario
    setIdeaSchedDate(toYMD(new Date()));
    setIdeaSchedDone(false);
  }

  function scheduleIdea() {
    if (!savedIdea || !formats[0] || !lines[0]) return;
    onAddPost({
      id: uid(),
      lineId: lines[0].id,     lineName: lines[0].name,
      formatId: formats[0].id, formatName: formats[0].name, formatColor: formats[0].color,
      title: savedIdea.title,  notes: savedIdea.notes,
      date: ideaSchedDate,     status: "pending", createdAt: Date.now(),
    });
    setIdeaSchedDone(true);
    setTimeout(() => { setSavedIdea(null); setShowForm(false); }, 1200);
  }

  function dismissIdeaPrompt() {
    setSavedIdea(null);
    setShowForm(false);
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
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

      {/* Add form / post-save prompt */}
      {showForm && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          {savedIdea ? (
            ideaSchedDone ? (
              <div className="flex items-center gap-2 py-2 text-emerald-400">
                <Check className="h-4 w-4" />
                <span className="text-sm font-semibold">Added to calendar!</span>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-white">Add to production calendar?</p>
                <p className="text-xs text-zinc-500 truncate">"{savedIdea.title}"</p>
                <input
                  type="date"
                  value={ideaSchedDate}
                  onChange={(e) => setIdeaSchedDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
                />
                <div className="flex gap-2 justify-end">
                  <button onClick={dismissIdeaPrompt} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition">Skip</button>
                  <button onClick={scheduleIdea} className="flex items-center gap-1 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-black">
                    <Calendar className="h-3.5 w-3.5" /> Schedule
                  </button>
                </div>
              </>
            )
          ) : (
            <>
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
            </>
          )}
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

              {/* Schedule toggle */}
              {schedulingId === idea.id ? (
                <ScheduleMiniForm
                  idea={idea}
                  lines={lines}
                  formats={formats}
                  onSchedule={(p) => { onAddPost(p); }}
                  onClose={() => setSchedulingId(null)}
                />
              ) : (
                <button
                  onClick={() => setSchedulingId(idea.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 hover:border-accent/40 hover:text-accent transition"
                >
                  <Calendar className="h-3 w-3" /> Add to calendar
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scripts (tap-to-select + bottom sheet) ───────────────────────────────────

function ScriptsView({
  briefs, formats, lines, onBack, onAdd, onDelete, onAddPost,
}: {
  briefs: Brief[];
  formats: ContentFormat[];
  lines: ContentLine[];
  onBack: () => void;
  onAdd: (b: Brief) => void;
  onDelete: (id: string) => void;
  onAddPost: (p: Post) => void;
}) {
  const [tab,          setTab]          = useState<"create" | "list">("create");
  const [selFormat,    setSelFormat]    = useState<ContentFormat | null>(null);
  const [selLine,      setSelLine]      = useState<ContentLine | null>(null);
  const [sheetOpen,    setSheetOpen]    = useState(false);
  const [fTitle,       setFTitle]       = useState("");
  const [fScript,      setFScript]      = useState("");
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [schedDate,    setSchedDate]    = useState(toYMD(new Date()));
  const [schedDone,    setSchedDone]    = useState<string | null>(null);

  // Post-save schedule prompt
  const [savedBrief,     setSavedBrief]     = useState<Brief | null>(null);
  const [postSaveDate,   setPostSaveDate]   = useState(toYMD(new Date()));
  const [postSaveDone,   setPostSaveDone]   = useState(false);

  // Auto-open sheet when both are selected
  useEffect(() => {
    if (selFormat && selLine) setSheetOpen(true);
  }, [selFormat, selLine]);

  function closeSheet() {
    setSheetOpen(false);
    setSelFormat(null);
    setSelLine(null);
    setFTitle("");
    setFScript("");
    setSavedBrief(null);
    setPostSaveDate(toYMD(new Date()));
    setPostSaveDone(false);
  }

  function submitBrief() {
    if (!selFormat || !selLine || !fTitle.trim()) return;
    const brief: Brief = {
      id: uid(),
      formatId: selFormat.id, formatName: selFormat.name, formatColor: selFormat.color,
      lineId: selLine.id,     lineName: selLine.name,
      title: fTitle.trim(),
      script: fScript.trim(),
      createdAt: Date.now(),
    };
    onAdd(brief);
    setSavedBrief(brief); // → muestra prompt de calendario
  }

  function scheduleFromSheet() {
    if (!savedBrief) return;
    onAddPost({
      id: uid(),
      lineId: savedBrief.lineId, lineName: savedBrief.lineName,
      formatId: savedBrief.formatId, formatName: savedBrief.formatName, formatColor: savedBrief.formatColor,
      title: savedBrief.title, notes: savedBrief.script || undefined,
      date: postSaveDate, status: "pending", createdAt: Date.now(),
    });
    setPostSaveDone(true);
    setTimeout(closeSheet, 1200);
  }

  function schedulePost(brief: Brief) {
    onAddPost({
      id: uid(),
      lineId: brief.lineId, lineName: brief.lineName,
      formatId: brief.formatId, formatName: brief.formatName, formatColor: brief.formatColor,
      title: brief.title, notes: brief.script || undefined,
      date: schedDate, status: "pending", createdAt: Date.now(),
    });
    setSchedDone(brief.id);
    setTimeout(() => { setSchedulingId(null); setSchedDone(null); }, 1500);
  }

  const step = !selFormat ? 1 : !selLine ? 2 : 3;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2 pb-32">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
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
      {tab === "create" && (<>
        {/* Step indicator */}
        <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 space-y-2.5">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Every <span className="text-white font-medium">Format</span> × <span className="text-white font-medium">Content Line</span> combination is a potential piece of content.
          </p>
          <div className="flex flex-col gap-1.5">
            {[
              { n: 1, label: "Pick a format",       done: !!selFormat },
              { n: 2, label: "Pick a content line",  done: !!selLine   },
              { n: 3, label: "Write your script",    done: false        },
            ].map((s) => (
              <div key={s.n} className="flex items-center gap-2.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold transition ${
                  s.done ? "bg-accent text-black" : step === s.n ? "border border-accent/50 text-accent" : "border border-white/10 text-zinc-600"
                }`}>
                  {s.done ? <Check className="h-3 w-3" /> : s.n}
                </div>
                <span className={`text-xs transition ${
                  s.done ? "text-white" : step === s.n ? "text-accent" : "text-zinc-600"
                }`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Two reference columns */}
        <div className="grid grid-cols-2 gap-3">
          {/* Formats */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase px-1">Formats</p>
            {formats.map((fmt) => {
              const isSelected = selFormat?.id === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelFormat(isSelected ? null : fmt)}
                  className={`w-full flex items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition border ${
                    isSelected ? "border-transparent bg-white/15 scale-[1.02]" : "border-white/10 bg-white/5 hover:bg-white/10 active:scale-95"
                  }`}
                  style={isSelected ? { boxShadow: `0 0 0 2px ${fmt.color}` } : {}}
                >
                  <div className="h-6 w-1.5 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: fmt.color }} />
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-xs text-zinc-200 leading-snug">{fmt.name}</p>
                    {fmt.description && (
                      <p className="text-[10px] text-zinc-500 leading-relaxed">{fmt.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Lines */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase px-1">Content Lines</p>
            {lines.map((line) => {
              const isSelected = selLine?.id === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => setSelLine(isSelected ? null : line)}
                  className={`w-full rounded-xl px-3 py-2.5 text-left transition border ${
                    isSelected ? "border-accent bg-accent/10 scale-[1.02]" : "border-white/10 bg-white/5 hover:bg-white/10 active:scale-95"
                  }`}
                >
                  <span className="text-xs text-zinc-200 leading-snug">{line.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </>)}

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
                <div className="flex items-center justify-between pt-1">
                  {schedulingId === brief.id ? (
                    schedDone === brief.id ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400"><Check className="h-3 w-3" /> Added!</span>
                    ) : (
                      <div className="flex items-center gap-2 flex-1">
                        <input type="date" value={schedDate} onChange={(e) => setSchedDate(e.target.value)}
                          className="flex-1 h-7 rounded-lg border border-white/10 bg-black/50 px-2 text-xs text-white outline-none [color-scheme:dark]" />
                        <button onClick={() => schedulePost(brief)} className="rounded-lg bg-accent px-2 py-1 text-[10px] font-bold text-black">Add</button>
                        <button onClick={() => setSchedulingId(null)} className="text-zinc-600 hover:text-white"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    )
                  ) : (
                    <button onClick={() => setSchedulingId(brief.id)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-accent transition">
                      <Calendar className="h-3 w-3" /> Schedule
                    </button>
                  )}
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

        {/* ── Post-save: schedule prompt ── */}
        {savedBrief ? (
          postSaveDone ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <div className="flex items-center gap-2 text-emerald-400">
                <Check className="h-5 w-5" />
                <span className="text-sm font-semibold">Added to calendar!</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-white">Add to production calendar?</p>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">"{savedBrief.title}"</p>
              </div>
              <input
                type="date"
                value={postSaveDate}
                onChange={(e) => setPostSaveDate(e.target.value)}
                className="w-full h-11 rounded-2xl border border-white/15 bg-white/5 px-4 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
              />
              <div className="flex gap-2">
                <button onClick={closeSheet} className="flex-1 rounded-2xl border border-white/10 py-3 text-sm text-zinc-400 hover:text-white transition">
                  Skip
                </button>
                <button onClick={scheduleFromSheet} className="flex-1 rounded-2xl bg-accent py-3 text-sm font-bold text-black">
                  Schedule
                </button>
              </div>
            </div>
          )
        ) : (
          <>
            {/* Pre-filled combo */}
            {selFormat && selLine && (
              <div className="flex flex-wrap gap-2 mb-4 items-center">
                <span className="rounded-full px-3 py-1 text-xs font-semibold text-black" style={{ backgroundColor: selFormat.color }}>
                  {selFormat.name}
                </span>
                <span className="text-zinc-500 text-sm">×</span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-zinc-300">
                  {selLine.name}
                </span>
              </div>
            )}
            <div className="space-y-3">
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
          </>
        )}
      </div>
    </div>
  );
}

// ─── Production Calendar ──────────────────────────────────────────────────────

function CalendarView({
  posts, lines, formats, onBack, onAdd, onDelete, onStatusChange,
}: {
  posts: Post[];
  lines: ContentLine[];
  formats: ContentFormat[];
  onBack: () => void;
  onAdd: (p: Post) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, s: PostStatus) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());
  const [selected, setSelected] = useState<string | null>(toYMD(today));
  const [showForm, setShowForm] = useState(false);

  // form state
  const [fTitle,  setFTitle]  = useState("");
  const [fLine,   setFLine]   = useState(lines[0]?.id ?? "");
  const [fFormat, setFFormat] = useState(formats[0]?.id ?? "");
  const [fDate,   setFDate]   = useState(toYMD(today));
  const [fNotes,  setFNotes]  = useState("");

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map date string -> posts
  const postsByDate: Record<string, Post[]> = {};
  posts.forEach((p) => {
    if (!postsByDate[p.date]) postsByDate[p.date] = [];
    postsByDate[p.date].push(p);
  });

  const selectedPosts = selected ? (postsByDate[selected] ?? []) : [];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function submitPost() {
    const t = fTitle.trim();
    if (!t || !fLine || !fFormat || !fDate) return;
    const line   = lines.find((l) => l.id === fLine)!;
    const format = formats.find((f) => f.id === fFormat)!;
    onAdd({
      id: uid(),
      lineId: line.id, lineName: line.name,
      formatId: format.id, formatName: format.name, formatColor: format.color,
      title: t, notes: fNotes.trim() || undefined,
      date: fDate, status: "pending", createdAt: Date.now(),
    });
    setFTitle(""); setFNotes(""); setShowForm(false);
    setSelected(fDate);
  }

  const todayStr = toYMD(today);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Content</p>
          <h1 className="text-2xl font-bold text-white">Production Calendar</h1>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFDate(selected ?? toYMD(today)); }}
          className="ml-auto flex items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-black"
        >
          <Plus className="h-3.5 w-3.5" /> Schedule post
        </button>
      </div>

      {/* New post form */}
      {showForm && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          <p className="text-xs font-semibold text-accent uppercase tracking-widest">New post</p>
          <input
            autoFocus
            type="text"
            value={fTitle}
            onChange={(e) => setFTitle(e.target.value)}
            placeholder="Post title or idea..."
            className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Content line</p>
              <select
                value={fLine}
                onChange={(e) => setFLine(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/15 bg-black/80 px-3 text-sm text-white outline-none focus:border-accent"
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Format</p>
              <select
                value={fFormat}
                onChange={(e) => setFFormat(e.target.value)}
                className="w-full h-10 rounded-xl border border-white/15 bg-black/80 px-3 text-sm text-white outline-none focus:border-accent"
              >
                {formats.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Date</p>
            <input
              type="date"
              value={fDate}
              onChange={(e) => setFDate(e.target.value)}
              className="w-full h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
            />
          </div>
          <textarea
            value={fNotes}
            onChange={(e) => setFNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none resize-none placeholder:text-zinc-600 focus:border-accent"
          />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white transition">Cancel</button>
            <button onClick={submitPost} className="flex items-center gap-1 rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-black">
              <Check className="h-3.5 w-3.5" /> Save
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Calendar grid */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          {/* Month nav */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="text-zinc-400 hover:text-white transition p-1">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-white">
              {MONTH_NAMES[month]} {year}
            </span>
            <button onClick={nextMonth} className="text-zinc-400 hover:text-white transition p-1">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 text-center">
            {["S","M","T","W","T","F","S"].map((d, i) => (
              <div key={i} className="text-[10px] font-medium text-zinc-600 py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayPosts = postsByDate[dateStr] ?? [];
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selected;

              return (
                <button
                  key={day}
                  onClick={() => setSelected(dateStr)}
                  className={`relative flex flex-col items-center rounded-xl py-1.5 transition ${
                    isSelected
                      ? "bg-accent text-black"
                      : isToday
                      ? "border border-accent/50 text-white"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-medium">{day}</span>
                  {dayPosts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {dayPosts.slice(0, 3).map((p) => (
                        <div
                          key={p.id}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: isSelected ? "black" : p.formatColor }}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day posts */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest">
            {selected ? parseYMD(selected).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "Select a day"}
          </p>

          {selectedPosts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <p className="text-xs text-zinc-600">No posts scheduled.</p>
            </div>
          ) : (
            selectedPosts.map((post) => (
              <div key={post.id} className="rounded-2xl border border-white/10 bg-white/5 p-3 space-y-2 group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: post.formatColor }} />
                      <span className="text-[10px] text-zinc-500">{post.lineName}</span>
                      <span className="text-[10px] text-zinc-600">·</span>
                      <span className="text-[10px] text-zinc-500">{post.formatName}</span>
                    </div>
                    <p className="text-sm text-white font-medium leading-snug">{post.title}</p>
                    {post.notes && <p className="text-xs text-zinc-400 mt-0.5">{post.notes}</p>}
                  </div>
                  <button
                    onClick={() => onDelete(post.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition flex-shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>

                {/* Status */}
                <div className="flex gap-1">
                  {(["pending","produced","published"] as PostStatus[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(post.id, s)}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
                        post.status === s
                          ? STATUS_COLOR[s]
                          : "bg-black/20 text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}

          {/* Upcoming posts teaser */}
          {(() => {
            const upcoming = posts
              .filter((p) => p.date > (selected ?? todayStr) && p.status !== "published")
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 3);
            if (!upcoming.length) return null;
            return (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Upcoming</p>
                {upcoming.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p.date)}
                    className="w-full flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-left hover:bg-white/10 transition"
                  >
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.formatColor }} />
                    <span className="text-xs text-zinc-300 truncate flex-1">{p.title}</span>
                    <span className="text-[10px] text-zinc-600 flex-shrink-0">
                      {parseYMD(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </button>
                ))}
              </div>
            );
          })()}
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

function TrendingView({ isPro, onBack }: { isPro: boolean; onBack: () => void }) {
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
      setVideos(data.videos);
      setLastFetch(data.cachedAt);
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
        <button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
          <ArrowLeft className="h-5 w-5" />
        </button>
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
  const [view, setView]       = useState<ContentView>("hub");
  const [lines, setLines]     = useState<ContentLine[]>([]);
  const [formats, setFormats] = useState<ContentFormat[]>([]);
  const [ideas, setIdeas]     = useState<Idea[]>([]);
  const [posts, setPosts]     = useState<Post[]>([]);
  const [briefs, setBriefs]   = useState<Brief[]>([]);

  const isPro = true; // TODO: conectar a auth

  // ── Load ──
  useEffect(() => {
    try {
      const load = <T,>(key: string, fallback: T[]): T[] => {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw) as T[];
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
      };
      setLines(load(CONTENT_LINES_KEY, DEFAULT_LINES));
      setFormats(load(CONTENT_FORMATS_KEY, DEFAULT_FORMATS));
      setIdeas(load(IDEAS_BANK_KEY, []));
      setPosts(load(POSTS_KEY, []));
      setBriefs(load(BRIEFS_KEY, []));
    } catch { /* ignore */ }
  }, []);

  // ── Persist ──
  useEffect(() => { localStorage.setItem(CONTENT_LINES_KEY,   JSON.stringify(lines));   }, [lines]);
  useEffect(() => { localStorage.setItem(CONTENT_FORMATS_KEY, JSON.stringify(formats)); }, [formats]);
  useEffect(() => { localStorage.setItem(IDEAS_BANK_KEY,      JSON.stringify(ideas));   }, [ideas]);
  useEffect(() => { localStorage.setItem(POSTS_KEY,           JSON.stringify(posts));   }, [posts]);
  useEffect(() => { localStorage.setItem(BRIEFS_KEY,          JSON.stringify(briefs));  }, [briefs]);

  // ── Handlers ──
  const addLine      = (l: ContentLine)   => setLines((prev) => [...prev, l]);
  const deleteLine   = (id: string)       => setLines((prev) => prev.filter((l) => l.id !== id));
  const addFormat    = (f: ContentFormat) => setFormats((prev) => [...prev, f]);
  const deleteFormat = (id: string)       => setFormats((prev) => prev.filter((f) => f.id !== id));

  const addIdea    = (i: Idea)   => setIdeas((prev) => [i, ...prev]);
  const deleteIdea = (id: string) => setIdeas((prev) => prev.filter((i) => i.id !== id));

  const addPost      = (p: Post)   => setPosts((prev) => [...prev, p]);
  const deletePost   = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));
  const changeStatus = (id: string, status: PostStatus) =>
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));

  const addBrief    = (b: Brief)  => setBriefs((prev) => [b, ...prev]);
  const deleteBrief = (id: string) => setBriefs((prev) => prev.filter((b) => b.id !== id));

  // ── Views ──
  if (view === "setup") return (
    <SetupView
      lines={lines} formats={formats} onBack={() => setView("hub")}
      onAddLine={addLine} onDeleteLine={deleteLine}
      onAddFormat={addFormat} onDeleteFormat={deleteFormat}
    />
  );

  if (view === "scripts") return (
    <ScriptsView
      briefs={briefs} formats={formats} lines={lines}
      onBack={() => setView("hub")}
      onAdd={addBrief} onDelete={deleteBrief}
      onAddPost={addPost}
    />
  );

  if (view === "ideas") return (
    <IdeasBankView
      ideas={ideas} lines={lines} formats={formats}
      onBack={() => setView("hub")}
      onAdd={addIdea} onDelete={deleteIdea}
      onAddPost={addPost}
    />
  );

  if (view === "calendar") return (
    <CalendarView
      posts={posts} lines={lines} formats={formats} onBack={() => setView("hub")}
      onAdd={addPost} onDelete={deletePost} onStatusChange={changeStatus}
    />
  );

  if (view === "trending") return (
    <TrendingView isPro={isPro} onBack={() => setView("hub")} />
  );

  return (
    <HubView
      onNavigate={setView}
      posts={posts}
      ideas={ideas}
      briefs={briefs}
      isPro={isPro}
    />
  );
}
