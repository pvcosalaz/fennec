"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Sparkles, Lightbulb, Pencil, Check, ArrowRight, FlaskConical } from "lucide-react";

const TRENDING_CACHE_KEY = "fennec-trending-ideas-v2";

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
  userName?: string;
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

export default function CalendarHub({
  tasks,
  onOpenSheet,
  onToggleDone,
  onDeleteTask,
  userName = "Paco",
}: Props) {
  const today = new Date();
  const todayYMD = toYMD(today);

  const [anchorDate, setAnchorDate] = useState<Date>(today);
  const [selectedDay, setSelectedDay] = useState<string>(todayYMD);
  const [inspireThumbnail, setInspireThumbnail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRENDING_CACHE_KEY);
      if (raw) {
        const { videos } = JSON.parse(raw) as { videos: { thumbnail: string }[] };
        if (videos?.[0]?.thumbnail) setInspireThumbnail(videos[0].thumbnail);
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
    <div className="flex flex-col min-h-full bg-zinc-950 text-white px-4 pt-6 pb-4 gap-5">
      {/* 1. Greeting section */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-widest text-accent">
          Music Content Creation Hub
        </span>
        <h1 className="text-2xl font-bold">
          {greetText} {greetEmoji}
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          Inspire, create and organize your content for your music personal brand.
        </p>
      </div>

      {/* 2. Week nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevWeek}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium text-zinc-300">{weekRangeLabel}</span>
        <button
          onClick={nextWeek}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          aria-label="Siguiente semana"
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
            buttonClass += "bg-amber-400 text-black";
          } else if (isToday) {
            buttonClass += "border border-amber-400/50 text-amber-400";
          } else {
            buttonClass += "text-zinc-500 hover:bg-zinc-800";
          }

          return (
            <button
              key={ymd}
              onClick={() => setSelectedDay(ymd)}
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

      {/* 4. Selected day tasks section */}
      <div className="flex flex-col gap-3 flex-1">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {selectedDay === todayYMD ? "Hoy" : formatDateES(selectedDay)}
        </span>

        {selectedTasks.length === 0 ? (
          <p className="text-xs text-zinc-600">No tasks for this day.</p>
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

                  {/* Delete */}
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="flex-shrink-0 text-zinc-600 hover:text-red-400 transition-colors text-sm leading-none mt-0.5"
                    aria-label="Eliminar tarea"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Tools section */}
      <div className="border-t border-zinc-800 pt-4 flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest text-zinc-500">Tools</span>

        {/* Inspire — hero card with thumbnail */}
        <button
          onClick={() => onOpenSheet("inspire")}
          className="relative w-full h-32 rounded-2xl overflow-hidden group"
        >
          {/* Background: thumbnail or fallback gradient */}
          {inspireThumbnail ? (
            <img
              src={inspireThumbnail}
              alt=""
              className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-800/60 to-zinc-900" />
          )}

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/10" />

          {/* Content */}
          <div className="absolute inset-0 flex items-end justify-between p-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-500/30 backdrop-blur-sm border border-purple-400/30 flex items-center justify-center">
                <Sparkles size={18} className="text-purple-300" />
              </div>
              <div className="text-left">
                <p className="text-white font-bold text-base leading-tight">Inspire</p>
                <p className="text-purple-200/70 text-xs">Trending in music production</p>
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <ArrowRight size={14} className="text-white" />
            </div>
          </div>
        </button>

        {/* Quick Ideas · My Scripts · Music Content Lab — 3 columns */}
        <div className="grid grid-cols-3 gap-2">
          {/* Quick Ideas */}
          <button
            onClick={() => onOpenSheet("ideas")}
            className="relative rounded-2xl overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, rgba(96,165,250,0.08) 0%, rgba(59,130,246,0.04) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(96,165,250,0.15)",
            }}
          >
            <div className="flex flex-col items-center gap-2 py-4 px-2">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 border border-blue-400/20 flex items-center justify-center group-hover:bg-blue-500/25 transition-colors">
                <Lightbulb size={16} className="text-blue-400" />
              </div>
              <span className="text-[11px] font-semibold text-blue-300 text-center leading-tight">Quick Ideas</span>
            </div>
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ boxShadow: "inset 0 0 0 1px rgba(96,165,250,0.35)" }} />
          </button>

          {/* My Scripts */}
          <button
            onClick={() => onOpenSheet("scripts")}
            className="relative rounded-2xl overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.04) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(251,191,36,0.15)",
            }}
          >
            <div className="flex flex-col items-center gap-2 py-4 px-2">
              <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center group-hover:bg-amber-500/25 transition-colors">
                <Pencil size={16} className="text-amber-400" />
              </div>
              <span className="text-[11px] font-semibold text-amber-300 text-center leading-tight">My Scripts</span>
            </div>
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ boxShadow: "inset 0 0 0 1px rgba(251,191,36,0.35)" }} />
          </button>

          {/* Music Content Lab */}
          <button
            onClick={() => onOpenSheet("lab")}
            className="relative rounded-2xl overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.04) 100%)",
              boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.15)",
            }}
          >
            <div className="flex flex-col items-center gap-2 py-4 px-2">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center group-hover:bg-emerald-500/25 transition-colors">
                <FlaskConical size={16} className="text-emerald-400" />
              </div>
              <span className="text-[11px] font-semibold text-emerald-300 text-center leading-tight">Music Content Lab</span>
            </div>
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ boxShadow: "inset 0 0 0 1px rgba(52,211,153,0.35)" }} />
          </button>
        </div>
      </div>
    </div>
  );
}
