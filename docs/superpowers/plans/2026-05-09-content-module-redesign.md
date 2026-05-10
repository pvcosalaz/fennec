# Content Module Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Content module so the calendar (week view) is the main hub, with Inspire/Ideas/Scripts opening as bottom sheets, all ending with a "¿Cuándo lo agendamos?" prompt that saves to the calendar.

**Architecture:** CalendarHub replaces HubView as the default screen. Three tool pills (Inspire, Ideas, Scripts) at the bottom open full-height bottom sheets. Each tool ends with a shared SchedulePrompt that adds a ContentTask to the calendar. Inspire passes video context into ScriptsView for the Inspire→Script→Calendar flow. All data stored in localStorage (existing pattern).

**Tech Stack:** Next.js 15 App Router, React, TypeScript strict, Tailwind CSS, localStorage persistence. No new dependencies.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `components/content/ContentModule.tsx` | Modify | Root — slim state manager + routing. Remove HubView/SetupView. Add sheet state. |
| `components/content/CalendarHub.tsx` | **Create** | Week calendar + greeting + 3 pills at bottom |
| `components/content/SchedulePrompt.tsx` | **Create** | Shared "¿Cuándo lo agendamos?" bottom modal |

All existing view functions (TrendingView, ScriptsView, IdeasBankView, CalendarView internals) stay in ContentModule.tsx but get new props for the schedule flow.

---

## Shared Types (reference throughout)

```typescript
// Replaces current Post type — much simpler
type ContentTask = {
  id: string;
  title: string;
  date: string;        // "YYYY-MM-DD"
  notes?: string;
  source: "manual" | "inspire" | "ideas" | "scripts";
  status: "pending" | "done";
  createdAt: number;
};

// Sheet state in root ContentModule
type ActiveSheet = "none" | "inspire" | "ideas" | "scripts";

// Video reference passed from Inspire → Scripts
type VideoRef = {
  title: string;
  channel: string;
  angle: string;   // Claude's suggested content angle
  url: string;
};
```

---

### Task 1: Create CalendarHub component (week view + greeting + pills)

**Files:**
- Create: `components/content/CalendarHub.tsx`

- [ ] **Step 1: Create the file with types and helpers**

```typescript
// components/content/CalendarHub.tsx
"use client";
import { ChevronLeft, ChevronRight, Sparkles, Lightbulb, Pencil, Check } from "lucide-react";

type ContentTask = {
  id: string;
  title: string;
  date: string;
  notes?: string;
  source: "manual" | "inspire" | "ideas" | "scripts";
  status: "pending" | "done";
  createdAt: number;
};

type Props = {
  tasks: ContentTask[];
  onOpenSheet: (sheet: "inspire" | "ideas" | "scripts") => void;
  onToggleDone: (id: string) => void;
  onDeleteTask: (id: string) => void;
  userName?: string;
};

function toYMD(d: Date) {
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
  if (h < 12) return { text: `Buenos días, ${userName}`, emoji: "☀️" };
  if (h < 19) return { text: `Buenas tardes, ${userName}`, emoji: "👋" };
  return { text: `Buenas noches, ${userName}`, emoji: "🌙" };
}

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const SOURCE_COLORS: Record<string, string> = {
  inspire: "bg-purple-400/20 text-purple-400",
  ideas:   "bg-blue-400/20 text-blue-400",
  scripts: "bg-amber-400/20 text-amber-400",
  manual:  "bg-zinc-400/20 text-zinc-400",
};
const SOURCE_LABELS: Record<string, string> = {
  inspire: "Inspire", ideas: "Ideas", scripts: "Script", manual: "Manual",
};
```

- [ ] **Step 2: Write the CalendarHub component**

```typescript
export default function CalendarHub({ tasks, onOpenSheet, onToggleDone, onDeleteTask, userName = "Paco" }: Props) {
  const today = new Date();
  const todayStr = toYMD(today);
  const [anchorDate, setAnchorDate] = useState(today);
  const [selectedDay, setSelectedDay] = useState(todayStr);

  const weekDays = getWeekDays(anchorDate);
  const weekStart = toYMD(weekDays[0]);
  const weekEnd   = toYMD(weekDays[6]);

  // Tasks grouped by date
  const tasksByDate: Record<string, ContentTask[]> = {};
  tasks.forEach((t) => {
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  });

  // Count tasks this week
  const weekTasks = tasks.filter((t) => t.date >= weekStart && t.date <= weekEnd);
  const pendingThisWeek = weekTasks.filter((t) => t.status === "pending").length;

  const { text: greetText, emoji } = greeting(userName);

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

  const selectedTasks = tasksByDate[selectedDay] ?? [];

  // Format week range label: "5–11 Mayo"
  const monthName = weekDays[0].toLocaleDateString("es-MX", { month: "long" });
  const weekLabel = `${weekDays[0].getDate()}–${weekDays[6].getDate()} ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`;

  return (
    <div className="mx-auto w-full max-w-lg flex flex-col gap-5 px-2 pb-4">

      {/* Greeting */}
      <div className="pt-2 space-y-0.5">
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Content</p>
        <h1 className="text-2xl font-bold text-white">{greetText} {emoji}</h1>
        <p className="text-sm text-zinc-400">
          {pendingThisWeek === 0
            ? "No tienes tareas esta semana. ¡Agrega una! 🎬"
            : `Tienes ${pendingThisWeek} tarea${pendingThisWeek > 1 ? "s" : ""} pendiente${pendingThisWeek > 1 ? "s" : ""} esta semana.`}
        </p>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevWeek} className="p-1.5 rounded-xl text-zinc-400 hover:text-white transition">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-zinc-300">{weekLabel}</span>
        <button onClick={nextWeek} className="p-1.5 rounded-xl text-zinc-400 hover:text-white transition">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, i) => {
          const ymd     = toYMD(day);
          const isToday = ymd === todayStr;
          const isSel   = ymd === selectedDay;
          const hasTasks = (tasksByDate[ymd]?.length ?? 0) > 0;
          return (
            <button
              key={ymd}
              onClick={() => setSelectedDay(ymd)}
              className={`flex flex-col items-center gap-1 py-2 rounded-2xl transition ${
                isSel   ? "bg-accent text-black"
                : isToday ? "border border-accent/50 text-accent"
                : "text-zinc-500 hover:text-white"
              }`}
            >
              <span className="text-[10px] font-medium uppercase">{DAY_LABELS[i]}</span>
              <span className={`text-sm font-bold ${isSel ? "text-black" : ""}`}>{day.getDate()}</span>
              <span className={`h-1.5 w-1.5 rounded-full ${
                hasTasks ? (isSel ? "bg-black/40" : "bg-accent") : "bg-transparent"
              }`} />
            </button>
          );
        })}
      </div>

      {/* Selected day tasks */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          {selectedDay === todayStr ? "Hoy" : new Date(selectedDay + "T12:00:00").toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })}
        </p>

        {selectedTasks.length === 0 && (
          <p className="text-xs text-zinc-600 py-3">Sin tareas este día.</p>
        )}

        {selectedTasks.map((task) => (
          <div key={task.id} className={`flex items-start gap-3 p-3 rounded-2xl border transition ${
            task.status === "done" ? "border-white/5 bg-white/[0.02] opacity-50" : "border-white/10 bg-white/[0.04]"
          }`}>
            <button
              onClick={() => onToggleDone(task.id)}
              className={`mt-0.5 h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                task.status === "done" ? "bg-accent border-accent" : "border-white/20 hover:border-accent"
              }`}
            >
              {task.status === "done" && <Check className="h-3 w-3 text-black" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium leading-snug ${task.status === "done" ? "line-through text-zinc-600" : "text-white"}`}>
                {task.title}
              </p>
              {task.notes && <p className="text-xs text-zinc-600 mt-0.5 line-clamp-2">{task.notes}</p>}
              <span className={`mt-1 inline-block text-[10px] font-medium rounded-full px-2 py-0.5 ${SOURCE_COLORS[task.source]}`}>
                {SOURCE_LABELS[task.source]}
              </span>
            </div>
            <button onClick={() => onDeleteTask(task.id)} className="text-zinc-700 hover:text-red-400 transition text-xs shrink-0 mt-0.5">✕</button>
          </div>
        ))}
      </div>

      {/* Tool pills */}
      <div className="border-t border-white/8 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-3">Herramientas</p>
        <div className="flex gap-2">
          <button
            onClick={() => onOpenSheet("inspire")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-400/40 hover:bg-purple-400/5 transition text-xs font-semibold text-zinc-300 hover:text-purple-300"
          >
            <Sparkles className="h-3.5 w-3.5" /> Inspire
          </button>
          <button
            onClick={() => onOpenSheet("ideas")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-400/40 hover:bg-blue-400/5 transition text-xs font-semibold text-zinc-300 hover:text-blue-300"
          >
            <Lightbulb className="h-3.5 w-3.5" /> Ideas
          </button>
          <button
            onClick={() => onOpenSheet("scripts")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:border-amber-400/40 hover:bg-amber-400/5 transition text-xs font-semibold text-zinc-300 hover:text-amber-300"
          >
            <Pencil className="h-3.5 w-3.5" /> Scripts
          </button>
        </div>
      </div>
    </div>
  );
}
```

Add `useState` to the import at the top:
```typescript
import { useState } from "react";
```

- [ ] **Step 3: Build and verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "CalendarHub\|error TS"
```
Expected: no errors mentioning CalendarHub.tsx

- [ ] **Step 4: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/CalendarHub.tsx
git commit -m "feat: CalendarHub — week view calendar with greeting and tool pills"
```

---

### Task 2: Create SchedulePrompt component

**Files:**
- Create: `components/content/SchedulePrompt.tsx`

This is a bottom sheet modal that slides up and asks "¿Cuándo lo agendamos?" with a date picker and confirm button.

- [ ] **Step 1: Create SchedulePrompt.tsx**

```typescript
// components/content/SchedulePrompt.tsx
"use client";
import { useState } from "react";
import { Calendar, Check } from "lucide-react";

type Props = {
  taskTitle: string;             // e.g. "Reel sobre FL Studio"
  onConfirm: (date: string) => void;  // YYYY-MM-DD
  onSkip: () => void;
};

function toYMD(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function SchedulePrompt({ taskTitle, onConfirm, onSkip }: Props) {
  const [date, setDate] = useState(toYMD(new Date()));
  const [done, setDone] = useState(false);

  function confirm() {
    setDone(true);
    setTimeout(() => onConfirm(date), 800);
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onSkip} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-3xl border-t border-white/10 bg-zinc-950 p-6 space-y-5 animate-in slide-in-from-bottom-4 duration-300">

        {done ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="h-12 w-12 rounded-full bg-accent/20 flex items-center justify-center">
              <Check className="h-6 w-6 text-accent" />
            </div>
            <p className="text-sm font-semibold text-white">¡Agendado! 🎬</p>
            <p className="text-xs text-zinc-500 text-center">Aparecerá en tu calendario de contenido.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">¿Cuándo lo agendamos?</p>
                <p className="text-xs text-zinc-500 leading-snug line-clamp-2">{taskTitle}</p>
              </div>
            </div>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-12 rounded-2xl border border-white/15 bg-black/40 px-4 text-sm text-white outline-none focus:border-accent [color-scheme:dark]"
            />

            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="flex-1 py-3 rounded-2xl border border-white/10 text-sm text-zinc-400 hover:text-white transition"
              >
                Ahora no
              </button>
              <button
                onClick={confirm}
                disabled={!date}
                className="flex-1 py-3 rounded-2xl bg-accent text-sm font-bold text-black disabled:opacity-40 transition hover:brightness-110"
              >
                Agendar
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "SchedulePrompt\|error TS"
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/SchedulePrompt.tsx
git commit -m "feat: SchedulePrompt — shared '¿Cuándo lo agendamos?' bottom sheet"
```

---

### Task 3: Add ContentTask type + update ContentModule state

**Files:**
- Modify: `components/content/ContentModule.tsx` (lines ~1672–1770, root component)

The root ContentModule currently manages `posts`, `ideas`, `briefs`, `lines`, `formats`. We simplify to `tasks: ContentTask[]` for the calendar, keep `ideas` and `briefs` for the tools, remove `lines`/`formats` (they add friction the user doesn't want anymore).

- [ ] **Step 1: Add ContentTask type and new localStorage key near top of file (around line 15)**

Find this block:
```typescript
type ContentView = "hub" | "setup" | "scripts" | "ideas" | "calendar" | "trending";
```

Replace with:
```typescript
type ContentView = "calendar" | "scripts" | "ideas" | "trending";
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
```

- [ ] **Step 2: Add TASKS_KEY constant near other localStorage keys**

Find the block with `const POSTS_KEY` and add after it:
```typescript
const TASKS_KEY = "fennec-content-tasks-v1";
```

- [ ] **Step 3: Rewrite ContentModule root component (lines ~1672–1770)**

Replace the entire `export default function ContentModule()` with:

```typescript
export default function ContentModule() {
  const [ideas,  setIdeas]  = useState<Idea[]>([]);
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [tasks,  setTasks]  = useState<ContentTask[]>([]);
  const [sheet,  setSheet]  = useState<ActiveSheet>("none");
  // When Inspire picks a video, pass it to Scripts
  const [videoRef, setVideoRef] = useState<VideoRef | null>(null);
  // SchedulePrompt state — title + source pending scheduling
  const [pendingTask, setPendingTask] = useState<{ title: string; notes?: string; source: ContentTask["source"] } | null>(null);

  const isPro = true; // TODO: connect to auth

  // ── Load ──
  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDEAS_BANK_KEY);
      if (raw) setIdeas(JSON.parse(raw) as Idea[]);
    } catch {}
    try {
      const raw = localStorage.getItem(BRIEFS_KEY);
      if (raw) setBriefs(JSON.parse(raw) as Brief[]);
    } catch {}
    try {
      const raw = localStorage.getItem(TASKS_KEY);
      if (raw) setTasks(JSON.parse(raw) as ContentTask[]);
    } catch {}
  }, []);

  // ── Persist ──
  useEffect(() => { localStorage.setItem(IDEAS_BANK_KEY, JSON.stringify(ideas));   }, [ideas]);
  useEffect(() => { localStorage.setItem(BRIEFS_KEY,     JSON.stringify(briefs));  }, [briefs]);
  useEffect(() => { localStorage.setItem(TASKS_KEY,      JSON.stringify(tasks));   }, [tasks]);

  // ── Task handlers ──
  function addTask(title: string, date: string, source: ContentTask["source"], notes?: string) {
    const t: ContentTask = { id: uid(), title, date, notes, source, status: "pending", createdAt: Date.now() };
    setTasks((prev) => [...prev, t]);
  }
  function toggleDone(id: string) {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status: t.status === "done" ? "pending" : "done" } : t));
  }
  function deleteTask(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Sheet logic ──
  function openSheet(s: "inspire" | "ideas" | "scripts") {
    setVideoRef(null);
    setSheet(s);
  }
  function closeSheet() {
    setSheet("none");
    setVideoRef(null);
    setPendingTask(null);
  }

  // Called when a tool wants to schedule something
  function requestSchedule(title: string, source: ContentTask["source"], notes?: string) {
    setPendingTask({ title, notes, source });
  }

  // Called when SchedulePrompt confirms a date
  function confirmSchedule(date: string) {
    if (!pendingTask) return;
    addTask(pendingTask.title, date, pendingTask.source, pendingTask.notes);
    setPendingTask(null);
    closeSheet();
  }

  // Inspire → Script connection
  function useVideoAsReference(video: VideoRef) {
    setVideoRef(video);
    setSheet("scripts");
  }

  return (
    <div className="relative">
      {/* Main calendar hub — always rendered */}
      <CalendarHub
        tasks={tasks}
        onOpenSheet={openSheet}
        onToggleDone={toggleDone}
        onDeleteTask={deleteTask}
      />

      {/* Bottom sheet overlay */}
      {sheet !== "none" && (
        <>
          <div className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm" onClick={closeSheet} />
          <div className="fixed bottom-0 left-0 right-0 z-40 mx-auto max-w-lg h-[88vh] rounded-t-3xl border-t border-white/10 bg-zinc-950 overflow-y-auto">
            <div className="sticky top-0 z-10 flex items-center justify-between px-4 pt-4 pb-2 bg-zinc-950 border-b border-white/5">
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <div />
              <button onClick={closeSheet} className="ml-auto text-zinc-500 hover:text-white transition text-sm">✕</button>
            </div>
            <div className="px-2 pb-8 pt-2">
              {sheet === "inspire" && (
                <TrendingView
                  isPro={isPro}
                  onBack={closeSheet}
                  onUseAsReference={useVideoAsReference}
                  onRequestSchedule={(title, notes) => requestSchedule(title, "inspire", notes)}
                />
              )}
              {sheet === "ideas" && (
                <IdeasBankView
                  ideas={ideas}
                  onBack={closeSheet}
                  onAdd={(i) => setIdeas((prev) => [i, ...prev])}
                  onDelete={(id) => setIdeas((prev) => prev.filter((i) => i.id !== id))}
                  onRequestSchedule={(title, notes) => requestSchedule(title, "ideas", notes)}
                />
              )}
              {sheet === "scripts" && (
                <ScriptsView
                  briefs={briefs}
                  videoRef={videoRef}
                  onBack={closeSheet}
                  onAdd={(b) => setBriefs((prev) => [b, ...prev])}
                  onDelete={(id) => setBriefs((prev) => prev.filter((b) => b.id !== id))}
                  onRequestSchedule={(title, notes) => requestSchedule(title, "scripts", notes)}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Schedule prompt — on top of everything */}
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
```

- [ ] **Step 4: Add imports for CalendarHub and SchedulePrompt at top of ContentModule**

Find the existing imports block and add:
```typescript
import CalendarHub from "./CalendarHub";
import SchedulePrompt from "./SchedulePrompt";
```

- [ ] **Step 5: Verify build**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

There will be errors because TrendingView, IdeasBankView, ScriptsView don't have the new props yet. That's expected — next tasks fix them.

- [ ] **Step 6: Commit what works so far**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/ContentModule.tsx
git commit -m "feat: ContentModule root — CalendarHub as default, sheet overlay, ContentTask type"
```

---

### Task 4: Update TrendingView to support "Usar como referencia" + schedule prompt

**Files:**
- Modify: `components/content/ContentModule.tsx` — `TrendingView` function (~line 1517)

- [ ] **Step 1: Update TrendingView props signature**

Find:
```typescript
function TrendingView({ isPro, onBack }: { isPro: boolean; onBack: () => void }) {
```

Replace with:
```typescript
function TrendingView({ isPro, onBack, onUseAsReference, onRequestSchedule }: {
  isPro: boolean;
  onBack: () => void;
  onUseAsReference?: (video: VideoRef) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
}) {
```

- [ ] **Step 2: Add "Usar como referencia" button to each video card**

Find the video card render inside TrendingView. Look for where `v.title`, `v.channel`, `v.why`, `v.angle` are rendered. After the existing card content, add:

```typescript
{/* Action buttons */}
<div className="flex gap-2 mt-3">
  <button
    onClick={() => onUseAsReference?.({
      title: v.title,
      channel: v.channel,
      angle: v.angle,
      url: v.url,
    })}
    className="flex-1 py-2 rounded-xl bg-accent/10 border border-accent/30 text-xs font-semibold text-accent hover:bg-accent/20 transition"
  >
    ✨ Usar como referencia
  </button>
  <button
    onClick={() => onRequestSchedule?.(v.title, `Basado en: ${v.url}\n\n${v.angle}`)}
    className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-white transition"
  >
    📅
  </button>
</div>
```

- [ ] **Step 3: Remove the old `onBack` arrow button from TrendingView header** (since it now lives in a sheet with its own close button)

Find in TrendingView:
```typescript
<button onClick={onBack} className="text-zinc-400 hover:text-accent transition">
  <ArrowLeft className="h-5 w-5" />
</button>
```
Remove that button (the sheet already has an X close button).

- [ ] **Step 4: Verify build**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "TrendingView\|error TS" | head -10
```

- [ ] **Step 5: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/ContentModule.tsx
git commit -m "feat: TrendingView — 'Usar como referencia' button + schedule prompt integration"
```

---

### Task 5: Update ScriptsView to accept VideoRef and show schedule prompt

**Files:**
- Modify: `components/content/ContentModule.tsx` — `ScriptsView` function (~line 873)

- [ ] **Step 1: Update ScriptsView props signature**

Find:
```typescript
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
```

Replace with:
```typescript
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
```

- [ ] **Step 2: Pre-fill title when videoRef is present**

Inside ScriptsView, find where `fTitle` state is initialized:
```typescript
const [fTitle, setFTitle] = useState("");
```
Replace with:
```typescript
const [fTitle, setFTitle] = useState(videoRef ? `Mi versión: ${videoRef.title.slice(0, 50)}` : "");
```

- [ ] **Step 3: Show video reference banner when videoRef is present**

Inside the ScriptsView JSX, right after the header/title, add this banner (before the format/line selectors):

```typescript
{videoRef && (
  <div className="rounded-2xl border border-purple-400/20 bg-purple-400/5 p-3 space-y-1">
    <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400">Referencia de Inspire</p>
    <p className="text-sm text-white font-medium line-clamp-2">{videoRef.title}</p>
    <p className="text-xs text-zinc-400 line-clamp-2">💡 {videoRef.angle}</p>
  </div>
)}
```

- [ ] **Step 4: Replace the post-save calendar prompt with onRequestSchedule**

Find the `scheduleFromSheet` function and the `savedBrief` / `postSaveDone` state. After calling `onAdd(brief)` in `submitBrief`, replace the `setSavedBrief(brief)` call with:

```typescript
onRequestSchedule?.(brief.title, brief.script || undefined);
```

Remove the `savedBrief`, `postSaveDate`, `postSaveDone` state variables and the related JSX (the inline schedule prompt that was inside the sheet) since SchedulePrompt now handles this globally.

- [ ] **Step 5: Remove `onAddPost` references** — ScriptsView no longer calls `onAddPost` directly (the root handles it). Remove any remaining `onAddPost` / `schedulePost` / `scheduleFromSheet` code.

- [ ] **Step 6: Verify build**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "ScriptsView\|error TS" | head -10
```

- [ ] **Step 7: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/ContentModule.tsx
git commit -m "feat: ScriptsView — videoRef banner, simplified props, schedule via SchedulePrompt"
```

---

### Task 6: Update IdeasBankView to use schedule prompt

**Files:**
- Modify: `components/content/ContentModule.tsx` — `IdeasBankView` function (~line 656)

- [ ] **Step 1: Update IdeasBankView props signature**

Find:
```typescript
function IdeasBankView({
  ideas, lines, formats, onBack, onAdd, onDelete, onAddPost,
}: {
  ideas: Idea[];
  lines: ContentLine[];
  formats: ContentFormat[];
  onBack: () => void;
  onAdd: (i: Idea) => void;
  onDelete: (id: string) => void;
  onAddPost: (p: Post) => void;
}) {
```

Replace with:
```typescript
function IdeasBankView({
  ideas, onBack, onAdd, onDelete, onRequestSchedule,
}: {
  ideas: Idea[];
  onBack: () => void;
  onAdd: (i: Idea) => void;
  onDelete: (id: string) => void;
  onRequestSchedule?: (title: string, notes?: string) => void;
}) {
```

- [ ] **Step 2: Replace all `onAddPost` calls with `onRequestSchedule`**

Find every place where `onAddPost(...)` is called inside IdeasBankView. Replace each with:
```typescript
onRequestSchedule?.(idea.title, idea.notes || undefined);
```
Where `idea` is the current Idea object being scheduled.

- [ ] **Step 3: Remove the inline ScheduleMiniForm / calendar prompt JSX** from inside IdeasBankView (the `savedIdea` state and related prompt). The global SchedulePrompt handles this now.

- [ ] **Step 4: Remove the ArrowLeft back button** from IdeasBankView header (the sheet X button handles closing).

- [ ] **Step 5: Verify build — expect clean**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/ContentModule.tsx
git commit -m "feat: IdeasBankView — simplified props, schedule via global SchedulePrompt"
```

---

### Task 7: Final wire-up, cleanup, and push

**Files:**
- Modify: `components/content/ContentModule.tsx` — remove dead code (HubView, SetupView, BeatGrid, CalendarView functions, old type aliases)

- [ ] **Step 1: Remove unused functions from ContentModule**

Delete the following function definitions entirely (they are no longer called):
- `function HubView(...)` — replaced by CalendarHub
- `function SetupView(...)` — removed from redesign
- `function BeatGrid(...)` — was only used in HubView
- `function CalendarView(...)` — replaced by CalendarHub
- `function ScheduleMiniForm(...)` — replaced by SchedulePrompt component
- `function postsInCurrentMonth(...)` — no longer needed
- `function publishingStreak(...)` — no longer needed
- `function lastNDays(...)` — no longer needed

- [ ] **Step 2: Remove unused type aliases and constants**

Remove:
```typescript
type PostStatus = ...
type Post = ...
type ContentLine = ...
type ContentFormat = ...
const POSTS_KEY = ...
const CONTENT_LINES_KEY = ...
const CONTENT_FORMATS_KEY = ...
const DEFAULT_LINES = ...
const DEFAULT_FORMATS = ...
```

- [ ] **Step 3: Remove unused imports** (ArrowLeft if no longer used, Calendar icon if replaced, etc.)

Run:
```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```
Fix any remaining errors from removed types.

- [ ] **Step 4: Final build check**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
npx tsc --noEmit 2>&1 | grep "error TS"
```
Expected: 0 errors.

- [ ] **Step 5: Commit and push**

```bash
cd "/Users/pacosalazar/Documents/Fennec App/fennec"
git add components/content/ContentModule.tsx
git commit -m "refactor: remove HubView, SetupView, CalendarView — ContentModule cleanup"
git push origin main
```

- [ ] **Step 6: Verify production**

```bash
curl -s https://fennec-pi.vercel.app/api/health
```
Expected: ALL SYSTEMS GO 🚀

Open `https://fennec-pi.vercel.app` → Content tab → should see week calendar with greeting.

---

## Summary of Changes

| Before | After |
|---|---|
| Hub with 4 numbered steps | Week calendar as home |
| Calendar is step 4 (last) | Calendar is the first thing you see |
| Schedule button on each tool | "¿Cuándo lo agendamos?" prompt after every action |
| Tools are full-screen replacements | Tools open as bottom sheets |
| Inspire has no connection to Scripts | Inspire → "Usar como referencia" → Scripts with context |
| Complex Post type (lineId, formatId) | Simple ContentTask (title, date, source, status) |
