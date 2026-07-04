"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, ArrowRight, Pencil, Lock } from "lucide-react";
import InspireHero from "@/components/remotion/InspireHero";
import { QuickIdeasCard, ContentLabCard, MyScriptsCard } from "@/components/remotion/ContentToolCards";
import { useSheetDismiss, SHEET_BOTTOM, SHEET_ENTER } from "@/components/ui/useSheetDismiss";

const TRENDING_CACHE_KEY = "fennec-trending-ideas-v3";

type ContentTask = {
  id: string;
  title: string;
  date: string; // "YYYY-MM-DD"
  notes?: string;
  source: "manual" | "inspire" | "ideas" | "scripts";
  status: "pending" | "done";
  createdAt: number;
};

type Props = {
  tasks: ContentTask[];
  onOpenSheet: (sheet: "inspire" | "ideas" | "scripts" | "lab") => void;
  onToggleDone: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onEditScript?: (taskTitle: string) => void;
  userName?: string;
  isPro?: boolean;
  onUpgrade?: () => void;
};

function toYMD(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getWeekDays(anchor: Date): Date[] {
  const d = new Date(anchor);
  const day = d.getDay(); // 0=Sun
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7)); // back to Monday
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function greeting(userName: string): { text: string; emoji: string } {
  const h = new Date().getHours();
  if (h < 5)  return { text: `Good evening, ${userName}`, emoji: "🌙" };
  if (h < 12) return { text: `Good morning, ${userName}`, emoji: "☀️" };
  if (h < 19) return { text: `Good afternoon, ${userName}`, emoji: "👋" };
  return { text: `Good evening, ${userName}`, emoji: "🌙" };
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SOURCE_COLORS: Record<string, string> = {
  inspire: "bg-purple-400/20 text-purple-400",
  ideas: "bg-blue-400/20 text-blue-400",
  scripts: "bg-amber-400/20 text-amber-400",
  manual: "bg-zinc-400/20 text-zinc-400",
};

const SOURCE_LABELS: Record<string, string> = {
  inspire: "Inspire",
  ideas: "Ideas",
  scripts: "Script",
  manual: "Manual",
};

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function formatDateES(ymd: string): string {
  const [year, month, day] = ymd.split("-").map(Number);
  return `${day} de ${MONTH_NAMES_ES[month - 1]} ${year}`;
}

function ProLock() {
  return (
    <>
      {/* Light tint — signals locked but keeps the card name/icon visible for sales */}
      <div className="absolute inset-0 z-10 rounded-2xl" style={{ background: "rgba(8,6,2,0.28)" }} />
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-accent text-black text-[9px] font-bold px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,166,35,0.45)]">
        <Lock size={9} /> Pro
      </div>
    </>
  );
}

export default function CalendarHub({
  tasks,
  onOpenSheet,
  onToggleDone,
  onDeleteTask,
  onEditScript,
  userName = "Paco",
  isPro = false,
  onUpgrade,
}: Props) {
  const today = new Date();
  const todayYMD = toYMD(today);

  const [anchorDate, setAnchorDate] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<string>(todayYMD);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const { sheetRef: daySheetRef, dismiss: dismissDaySheet } = useSheetDismiss(() => setDayDetailOpen(false));
  const [inspireThumbnail, setInspireThumbnail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRENDING_CACHE_KEY);
      if (raw) {
        const { videos, cachedAt } = JSON.parse(raw) as { videos: { thumbnail: string }[]; cachedAt: number };
        const isExpired = Date.now() - (cachedAt ?? 0) > 1000 * 60 * 60 * 24;
        if (!isExpired && videos?.[0]?.thumbnail) setInspireThumbnail(videos[0].thumbnail);
      }
    } catch { /* ignore */ }
  }, []);

  const weekDays = getWeekDays(anchorDate);
  const weekStart = toYMD(weekDays[0]);
  const weekEnd = toYMD(weekDays[6]);

  const weekTasks = tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd);
  const pendingThisWeek = weekTasks.filter((t) => t.status === "pending").length;

  const tasksByDate = tasks.reduce<Record<string, ContentTask[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  const selectedTasks = tasksByDate[selectedDay] ?? [];

  const { text: greetText, emoji: greetEmoji } = greeting(userName);

  // Week range label: e.g. "5–11 Mayo"
  const startDay = weekDays[0].getDate();
  const endDay = weekDays[6].getDate();
  const monthName = MONTH_NAMES_ES[weekDays[0].getMonth()];
  const weekRangeLabel = `${startDay}–${endDay} ${monthName}`;

  function prevWeek() {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() - 7);
    setAnchorDate(d);
  }

  function nextWeek() {
    const d = new Date(anchorDate);
    d.setDate(d.getDate() + 7);
    setAnchorDate(d);
  }

  return (
    <>
    <div className="mx-auto w-full max-w-4xl flex flex-col flex-1 gap-3 px-4 pb-3 text-white">
      {/* 1. Greeting header */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <p className="text-[10px] font-bold tracking-[0.18em] text-accent/70 uppercase flex-shrink-0">
            Content Hub
          </p>
          <div className="h-px flex-1 bg-gradient-to-r from-accent/20 to-transparent" />
        </div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
          {greetText} {greetEmoji}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
          Inspire, create and organize content for your personal brand.
        </p>
      </div>

      {/* 2. Calendar (gráfica) */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4 space-y-3 flex-shrink-0">
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Previous week"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-zinc-300">{weekRangeLabel}</span>
        <button
          onClick={nextWeek}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Next week"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 3. Week grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const ymd = toYMD(day);
          const isSelected = ymd === selectedDay;
          const isToday = ymd === todayYMD;
          const hasTasks = (tasksByDate[ymd]?.length ?? 0) > 0;

          let buttonClass =
            "flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ";
          if (isSelected) {
            buttonClass += "bg-accent text-black shadow-[0_0_14px_rgba(245,166,35,0.3)]";
          } else if (isToday) {
            buttonClass += "border border-accent/50 text-accent";
          } else {
            buttonClass += "text-zinc-500 hover:bg-zinc-800";
          }

          return (
            <button
              key={ymd}
              onClick={() => { setSelectedDay(ymd); setDayDetailOpen(true); }}
              className={buttonClass}
            >
              <span className="text-xs uppercase">{DAY_LABELS[i]}</span>
              <span className="text-sm font-bold">{day.getDate()}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hasTasks
                    ? isSelected
                      ? "bg-black"
                      : "bg-amber-400"
                    : "bg-transparent"
                }`}
              />
            </button>
          );
        })}
      </div>
      </div>{/* end calendar card */}

      {/* 3. Inspire — hero (Pro) */}
      <button
        onClick={() => { if (isPro) onOpenSheet("inspire"); else onUpgrade?.(); }}
        className="relative w-full rounded-2xl overflow-hidden flex-shrink-0"
        style={{ height: 150 }}
      >
        <InspireHero />
        {!isPro && <ProLock />}
      </button>

      {/* 4. Tool grid: 3 cols — grows to fill remaining height */}
      <div className="grid grid-cols-3 gap-2 flex-1" style={{ minHeight: 120 }}>
        <button onClick={() => onOpenSheet("ideas")} className="relative rounded-2xl overflow-hidden h-full">
          <QuickIdeasCard />
        </button>
        <button onClick={() => { if (isPro) onOpenSheet("lab"); else onUpgrade?.(); }} className="relative rounded-2xl overflow-hidden h-full">
          <ContentLabCard />
          {!isPro && <ProLock />}
        </button>
        <button onClick={() => onOpenSheet("scripts")} className="relative rounded-2xl overflow-hidden h-full">
          <MyScriptsCard />
        </button>
      </div>
    </div>

    {/* ── Day detail overlay (al picar un día) ── */}
    {dayDetailOpen && (
      <>
        <div
          className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm"
          style={{ animation: "sheetFadeIn .25s ease both" }}
          onClick={dismissDaySheet}
        />
        <div
          ref={daySheetRef}
          className="fixed left-0 right-0 z-40 max-h-[70vh] rounded-t-3xl border-t border-white/10 bg-zinc-950 overflow-y-auto"
          style={{ bottom: SHEET_BOTTOM, animation: SHEET_ENTER }}
        >
          <div className="sticky top-0 z-10 flex items-center justify-center px-4 pt-3 pb-2 bg-zinc-950">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
          <div className="px-4 pb-8 pt-1 flex flex-col gap-3 text-white">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {selectedDay === todayYMD ? "Today" : formatDateES(selectedDay)}
              </span>
              <button
                onClick={() => setDayDetailOpen(false)}
                className="text-xs text-zinc-500 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>

            {selectedTasks.length === 0 ? (
              <p className="text-xs text-zinc-600 py-8 text-center">
                Nothing scheduled for this day.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedTasks.map((task) => {
                  const isDone = task.status === "done";
                  return (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-xl bg-zinc-900 transition-opacity ${
                        isDone ? "opacity-50" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => onToggleDone(task.id)}
                        className={`mt-0.5 flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isDone
                            ? "bg-amber-400 border-amber-400"
                            : "border-zinc-600 hover:border-amber-400"
                        }`}
                        aria-label={isDone ? "Marcar pendiente" : "Marcar como hecha"}
                      >
                        {isDone && <Check size={12} className="text-black" strokeWidth={3} />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            isDone ? "line-through text-zinc-600" : "text-white"
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.notes && (
                          <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">
                            {task.notes}
                          </p>
                        )}
                        <span
                          className={`inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium ${
                            SOURCE_COLORS[task.source]
                          }`}
                        >
                          {SOURCE_LABELS[task.source]}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0 mt-0.5">
                        {task.source === "scripts" && onEditScript && (
                          <button
                            onClick={() => { onEditScript(task.title); setDayDetailOpen(false); }}
                            className="text-zinc-600 hover:text-amber-400 transition-colors"
                            aria-label="Edit script"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => onDeleteTask(task.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors text-sm leading-none"
                          aria-label="Delete task"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </>
    )}
    </>
  );
}
