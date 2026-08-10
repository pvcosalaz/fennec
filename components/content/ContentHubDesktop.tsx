"use client";
import { useTranslation } from "react-i18next";
import i18nInstance from "@/lib/i18n";

import { useState } from "react";
import {
  ChevronLeft, ChevronRight, Check, Pencil, Lock, Plus,
  Zap, Sparkles, FlaskConical, FileText,
} from "lucide-react";
import { RiseStyle, SURFACE } from "@/components/desktop/ui";

/* ═══════════════════════════════════════════════════════════════
   MARKETING — desktop. The mobile hub is a week strip + big tool
   tiles; on a big screen the calendar IS the module: a full month
   grid with every scheduled post visible in place (Notion-calendar
   style), a day panel on the right with quick-add, and the four
   tools as a compact toolbar. Same tasks state, same handlers —
   presentation only. Mobile keeps CalendarHub untouched.
   ═══════════════════════════════════════════════════════════════ */

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
  /** Abre el CONTENIDO de la tarea: el guion con su referencia y teleprompter
   *  si existe, o la herramienta de origen si no. El desglose ya existia
   *  (ScriptDetailOverlay) pero solo se llegaba por el lapiz, y solo en
   *  guiones: la idea programada era un titulo muerto (Paco 2026-08-04). */
  onOpenTask?: (title: string, source: ContentTask["source"]) => void;
  onDeleteTask: (id: string) => void;
  onEditScript?: (taskTitle: string) => void;
  onAddTask?: (title: string, date: string) => void;
  /** live counts so the tool cards show real state, not empty labels */
  ideasCount?: number;
  scriptsCount?: number;
  isPro?: boolean;
  onUpgrade?: () => void;
};

// Same YMD convention as CalendarHub so chips land on the same days.
const toYMD = (d: Date): string =>
  /* Local, no UTC — ver la nota en CalendarHub.toYMD. */
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* Claves, no texto: se traducen al pintar. */
const DAY_LABELS = ["mkMon", "mkTue", "mkWed", "mkThu", "mkFri", "mkSat", "mkSun"];

/* Meses por diccionario. i18n.t directo (no el hook) porque fmtLong es una
   funcion de modulo; el hook de los componentes re-renderiza al cambiar idioma
   y con eso el texto se refresca igual. */
const monthName = (m: number) => i18nInstance.t("mkM" + m);

const SOURCE_DOT: Record<ContentTask["source"], string> = {
  inspire: "#c084fc",
  ideas:   "#60a5fa",
  scripts: "#f5a623",
  manual:  "#a1a1aa",
};

const SOURCE_LABELS: Record<ContentTask["source"], string> = {
  inspire: "mkSrcInspire",
  ideas:   "mkSrcIdeas",
  scripts: "mkSrcScript",
  manual:  "mkSrcManual",
};

function fmtLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${monthName(m - 1)} ${d}, ${y}`;
}

export default function ContentHubDesktop({
  tasks, onOpenSheet, onToggleDone, onDeleteTask, onEditScript, onAddTask, onOpenTask,
  ideasCount = 0, scriptsCount = 0,
  isPro = false, onUpgrade,
}: Props) {
  const { t } = useTranslation();
  const today = new Date();
  const todayYMD = toYMD(today);

  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(todayYMD);
  const [draft, setDraft] = useState("");

  const tasksByDate = tasks.reduce<Record<string, ContentTask[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});
  const selectedTasks = tasksByDate[selectedDay] ?? [];

  // ── month grid: Monday-first, whole weeks ──
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const rows = Math.ceil((startOffset + daysInMonth) / 7);
  const cells: Date[] = Array.from({ length: rows * 7 }, (_, i) =>
    new Date(viewYear, viewMonth, 1 - startOffset + i)
  );

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function submitDraft() {
    const t = draft.trim();
    if (!t || !onAddTask) return;
    onAddTask(t, selectedDay);
    setDraft("");
  }

  // The tools are the creative heart of this module — they get full cards
  // (icon chip + name + live state), not corner pills. Same card language
  // as the Business hub's tool row, so both modules read as one product.
  const TOOLS: { id: "inspire" | "ideas" | "lab" | "scripts"; label: string; sub: string; icon: React.ComponentType<{ className?: string }>; pro: boolean }[] = [
    /* Las dos libres primero y las dos PRO juntas a la derecha. Alternadas
       (libre, PRO, libre, PRO) la insignia amarilla rebotaba de un lado a otro
       y no se leia un grupo, sino cuatro casos sueltos (Paco 2026-08-03).
       Juntas, la fila dice de un vistazo donde termina lo tuyo y donde empieza
       lo que se desbloquea. */
    /* Mis guiones ABRE la fila (Paco 2026-08-06): es el destino, no la
       entrada. Casi toda visita a Marketing es a revisar o retomar un guion
       que ya existe; capturar una idea suelta es lo ocasional. La primera
       tarjeta debe ser a lo que vienes, no al paso previo. */
    { id: "scripts", label: t("mkMyScripts"),  sub: scriptsCount > 0 ? t("mkScriptsWritten", { count: scriptsCount }) : t("mkEverythingLands"), icon: FileText, pro: false },
    { id: "ideas",   label: t("mkQuickIdeas"), sub: ideasCount > 0 ? t("mkSavedIdeas", { count: ideasCount }) : t("mkCaptureIdeas"), icon: Sparkles, pro: false },
    { id: "inspire", label: "Inspire",     /* Cuatro palabras que venden, no una descripcion que se corta: "Trending
       references for your ge…" truncado no invita a nada, y esta tarjeta es el
       gancho de PRO (Paco 2026-08-04). */
      sub: t("mkStealTrending"), icon: Zap,          pro: true },
    { id: "lab",     label: t("mkContentLab"), sub: t("mkTurnMusic"),        icon: FlaskConical, pro: true },
  ];

  return (
    <div className="text-white">
      <RiseStyle />
      {/* ── header: month + navigation only ── */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[21px] font-bold tracking-tight">
          {monthName(viewMonth)} <span className="text-zinc-600">{viewYear}</span>
        </h1>
        <div className="flex items-center gap-0.5">
          <button onClick={() => shiftMonth(-1)} aria-label={t("chdMesAnterior")} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDay(todayYMD); }}
            className="rounded-lg px-2 py-1 text-[11px] font-semibold text-zinc-500 transition hover:bg-white/5 hover:text-white"
          >
            {t("mkToday")}
          </button>
          <button onClick={() => shiftMonth(1)} aria-label={t("chdMesSiguiente")} className="rounded-lg p-1.5 text-zinc-500 transition hover:bg-white/5 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── the four tools, first-class ── */}
      <div className="dd-rise mb-4 grid grid-cols-4 gap-3" style={{ animationDelay: ".06s" }}>
        {TOOLS.map(({ id, label, sub, icon: Icon, pro }) => {
          const locked = pro && !isPro;
          return (
            <button
              key={id}
              onClick={() => (locked ? onUpgrade?.() : onOpenSheet(id))}
              style={SURFACE}
              className="group flex items-center gap-3.5 rounded-xl px-4 py-4 text-left transition hover:brightness-125"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg transition group-hover:bg-accent/10" style={{ background: "rgba(255,255,255,.04)" }}>
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <b className="text-[13.5px] font-bold text-white">{label}</b>
                  {locked && (
                    <span className="flex items-center gap-0.5 rounded-full bg-accent px-1.5 py-[1px] text-[8px] font-bold text-black">
                      <Lock className="h-2 w-2" /> PRO
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-zinc-500">{sub}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── month grid + day panel ── */}
      <div className="grid items-start gap-6" style={{ gridTemplateColumns: "minmax(0,2.3fr) minmax(280px,1fr)" }}>

        {/* month grid */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.07]" style={{ background: "rgba(255,255,255,.015)" }}>
          <div className="grid grid-cols-7 border-b border-white/[0.06]">
            {DAY_LABELS.map((l) => (
              <div key={l} className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.18em] text-zinc-600">{t(l)}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((d, i) => {
              const ymd = toYMD(d);
              const inMonth = d.getMonth() === viewMonth;
              const isToday = ymd === todayYMD;
              const isSelected = ymd === selectedDay;
              const dayTasks = tasksByDate[ymd] ?? [];
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(ymd)}
                  className="relative flex min-h-[96px] flex-col items-stretch gap-1 border-b border-r border-white/[0.045] p-2 text-left transition hover:bg-white/[0.03]"
                  style={{
                    background: isSelected ? "rgba(245,166,35,.06)" : undefined,
                    boxShadow: isSelected ? "inset 0 0 0 1px rgba(245,166,35,.45)" : undefined,
                  }}
                >
                  <span
                    className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold tabular-nums ${
                      isToday ? "bg-accent text-black" : inMonth ? "text-zinc-300" : "text-zinc-700"
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  {dayTasks.slice(0, 2).map((t) => (
                    <span
                      key={t.id}
                      className={`flex items-center gap-1 truncate rounded-md px-1.5 py-[3px] text-[10px] font-medium ${
                        t.status === "done" ? "text-zinc-600 line-through" : "text-zinc-200"
                      }`}
                      style={{ background: "rgba(255,255,255,.045)" }}
                    >
                      <i className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: SOURCE_DOT[t.source] }} />
                      <span className="truncate">{t.title}</span>
                    </span>
                  ))}
                  {dayTasks.length > 2 && (
                    <span className="px-1.5 text-[9.5px] font-semibold text-zinc-600">+{dayTasks.length - 2} more</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* day panel */}
        <aside className="rounded-2xl border border-white/[0.07] p-4" style={{ background: "rgba(255,255,255,.015)" }}>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[14px] font-bold text-white">
              {selectedDay === todayYMD ? t("mkToday") : fmtLong(selectedDay)}
            </h2>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
              {t("mkPosts", { count: selectedTasks.length })}
            </span>
          </div>

          {/* quick add — click a day, type, enter */}
          {onAddTask && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 transition focus-within:border-accent/40">
              <Plus className="h-3.5 w-3.5 flex-shrink-0 text-zinc-600" />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitDraft(); }}
                placeholder={t("mkSchedulePost")}
                className="w-full bg-transparent text-[12.5px] text-white placeholder:text-zinc-600 outline-none"
              />
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2">
            {selectedTasks.length === 0 ? (
              <p className="py-8 text-center text-[12px] text-zinc-600">{t("mkNothingThisDay")}</p>
            ) : (
              selectedTasks.map((task) => {
                const isDone = task.status === "done";
                return (
                  <div key={task.id} className={`flex items-start gap-2.5 rounded-xl p-2.5 transition ${isDone ? "opacity-50" : ""}`} style={{ background: "rgba(255,255,255,.03)" }}>
                    <button
                      onClick={() => onToggleDone(task.id)}
                      aria-label={isDone ? "Mark pending" : "Mark done"}
                      className={`mt-0.5 flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-2 transition ${
                        isDone ? "border-accent bg-accent" : "border-zinc-600 hover:border-accent"
                      }`}
                    >
                      {isDone && <Check size={11} className="text-black" strokeWidth={3} />}
                    </button>
                    <button
                      type="button"
                      disabled={task.source === "manual" || !onOpenTask}
                      onClick={() => onOpenTask?.(task.title, task.source)}
                      className="min-w-0 flex-1 text-left disabled:cursor-default"
                    >
                      <p className={`text-[12.5px] font-medium leading-snug transition ${isDone ? "text-zinc-600 line-through" : "text-white"} ${task.source !== "manual" && onOpenTask ? "hover:text-accent" : ""}`}>
                        {task.title}
                      </p>
                      {task.notes && <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-600">{task.notes}</p>}
                      <span className="mt-1 inline-flex items-center gap-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                        <i className="h-1.5 w-1.5 rounded-full" style={{ background: SOURCE_DOT[task.source] }} />
                        {t(SOURCE_LABELS[task.source])}
                      </span>
                    </button>
                    <div className="mt-0.5 flex flex-shrink-0 items-center gap-2">
                      {task.source === "scripts" && onEditScript && (
                        <button onClick={() => onEditScript(task.title)} aria-label={t("sdEditAria")} className="text-zinc-600 transition hover:text-accent">
                          <Pencil size={13} />
                        </button>
                      )}
                      <button onClick={() => onDeleteTask(task.id)} aria-label={t("chBorrarTarea")} className="text-sm leading-none text-zinc-600 transition hover:text-red-400">
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
