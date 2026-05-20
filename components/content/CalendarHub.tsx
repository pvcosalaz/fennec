"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check, ArrowRight, Pencil } from "lucide-react";

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

export default function CalendarHub({
  tasks,
  onOpenSheet,
  onToggleDone,
  onDeleteTask,
  onEditScript,
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
    <div className="flex flex-col text-white gap-5 px-4">
      {/* 1. Greeting section */}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
          Music Content Creation Hub
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
          {greetText} {greetEmoji}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
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
      <div className="flex flex-col gap-3">
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

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 mt-0.5">
                    {task.source === "scripts" && onEditScript && (
                      <button
                        onClick={() => onEditScript(task.title)}
                        className="text-zinc-600 hover:text-amber-400 transition-colors"
                        aria-label="Editar script"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="text-zinc-600 hover:text-red-400 transition-colors text-sm leading-none"
                      aria-label="Eliminar tarea"
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

      {/* 5. Tools section */}
      <div className="border-t border-zinc-800 pt-4 flex flex-col gap-3">
        <span className="text-xs uppercase tracking-widest text-zinc-500">Tools</span>

        {/* Inspire — hero card, spotlight style */}
        <button
          onClick={() => onOpenSheet("inspire")}
          className="relative w-full rounded-2xl overflow-hidden group"
          style={{ background: "radial-gradient(ellipse 80% 80% at 50% 0%, #2a2a2a 0%, #161616 100%)" }}
        >
          <div className="flex flex-col items-center gap-2 py-6 px-4">
            <span className="text-5xl leading-none">⚡</span>
            <p className="text-white font-bold text-base leading-tight">Inspire</p>
            <p className="text-zinc-500 text-xs">Daily trends in music production</p>
          </div>
        </button>

        {/* Quick Ideas · Music Content Lab · My Scripts */}
        <div className="flex gap-2 items-stretch">
          {/* Quick Ideas */}
          <button
            onClick={() => onOpenSheet("ideas")}
            className="relative rounded-2xl overflow-hidden group flex-1"
            style={{ background: "radial-gradient(ellipse 120% 120% at 50% 0%, #222 0%, #161616 100%)" }}
          >
            <div className="flex flex-col items-center gap-2 py-5 px-2">
              <span className="text-4xl leading-none">💡</span>
              <span className="text-[11px] font-semibold text-zinc-500 text-center leading-tight">Quick Ideas</span>
            </div>
          </button>

          {/* Music Content Lab */}
          <button
            onClick={() => onOpenSheet("lab")}
            className="relative rounded-2xl overflow-hidden group flex-[1.6]"
            style={{ background: "radial-gradient(ellipse 120% 120% at 50% 0%, #222 0%, #161616 100%)" }}
          >
            <div className="flex flex-col items-center gap-2.5 py-5 px-3">
              <span className="text-5xl leading-none">🧪</span>
              <span className="text-[12px] font-semibold text-zinc-500 text-center leading-tight">Music Content Lab</span>
            </div>
          </button>

          {/* My Scripts */}
          <button
            onClick={() => onOpenSheet("scripts")}
            className="relative rounded-2xl overflow-hidden group flex-1"
            style={{ background: "radial-gradient(ellipse 120% 120% at 50% 0%, #222 0%, #161616 100%)" }}
          >
            <div className="flex flex-col items-center gap-2 py-5 px-2">
              <span className="text-4xl leading-none">✍️</span>
              <span className="text-[11px] font-semibold text-zinc-500 text-center leading-tight">My Scripts</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
