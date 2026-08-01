"use client";

import { useState, useEffect, useRef } from "react";

/** How long after a local edit we ignore realtime echoes. Long enough to cover
 *  a round trip, short enough that a genuine edit from another device lands
 *  almost as soon as you stop typing. */
const LOCAL_EDIT_GUARD_MS = 2500;
/** Typing shouldn't hit the network on every keystroke. */
const WRITE_DEBOUNCE_MS = 700;
import {
  ChevronLeft,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  Banknote,
  X,
  ChevronRight,
  Lock,
  ListChecks,
} from "lucide-react";
import Select from "@/components/ui/Select";
import {
  type Project,
  type ProjectStatus,
  type Client,
  projectTypes,
  formatCOP,
  projectMoney,
  paymentsTotal,
  deliverableProgress,
  EMPTY_BRIEF,
} from "@/lib/pricingData";
import { formatMoney, getCurrency, type Currency } from "@/lib/currency";
import ProjectDetail from "@/components/business/ProjectDetail";
import {
  getProjects,
  upsertProject,
  deleteProject,
  getClients,
} from "@/lib/businessDb";
import { supabase } from "@/lib/supabase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_ORDER: ProjectStatus[] = ["in_progress", "review", "delivered", "paid"];

const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  in_progress: { label: "In Progress", color: "text-blue-400",   bg: "bg-blue-400/10",   icon: Clock        },
  review:      { label: "In Review",   color: "text-amber-400",  bg: "bg-amber-400/10",  icon: Send         },
  delivered:   { label: "Delivered",   color: "text-purple-400", bg: "bg-purple-400/10", icon: CheckCircle2 },
  paid:        { label: "Paid",        color: "text-emerald-400",bg: "bg-emerald-400/10",icon: Banknote     },
};

function deadlineInfo(deadline: string): { label: string; color: string } {
  if (!deadline) return { label: "No deadline", color: "text-zinc-600" };
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0)  return { label: `${Math.abs(days)}d overdue`, color: "text-red-400" };
  if (days === 0) return { label: "Due today",                  color: "text-red-400" };
  if (days <= 3)  return { label: `${days}d left`,             color: "text-red-400" };
  if (days <= 7)  return { label: `${days}d left`,             color: "text-amber-400" };
  return { label: `${days}d left`, color: "text-emerald-400" };
}

function nextStatus(current: ProjectStatus): ProjectStatus {
  const idx = STATUS_ORDER.indexOf(current);
  return STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
}

function prevStatus(current: ProjectStatus): ProjectStatus | null {
  const idx = STATUS_ORDER.indexOf(current);
  return idx > 0 ? STATUS_ORDER[idx - 1] : null;
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/10 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        <Clock className="h-6 w-6 text-zinc-500" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">No active projects</p>
        {/* The normal route is a quote the client approved. Manual creation is
            the exception (work that started before Fennec), so it reads as one
            instead of sitting here as the primary button. */}
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-zinc-500">
          Projects start when a client approves a quote. Head to Quotes and hit
          &ldquo;Mark as approved&rdquo;.
        </p>
      </div>
      <button
        onClick={onAdd}
        className="text-xs font-medium text-zinc-500 underline underline-offset-4 transition hover:text-accent"
      >
        Or log work that started outside Fennec
      </button>
    </div>
  );
}

// ─── Project form ─────────────────────────────────────────────────────────────

type FormState = {
  name: string;
  clientId: string;
  projectTypeId: string;
  price: string;
  deadline: string;
  notes: string;
};

const EMPTY_FORM: FormState = {
  name: "", clientId: "", projectTypeId: "", price: "", deadline: "", notes: "",
};

function ProjectForm({
  initial,
  clients,
  onSave,
  onCancel,
}: {
  initial?: Partial<FormState>;
  clients: Client[];
  onSave: (f: FormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, ...initial });
  const set = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const valid = form.name.trim() && form.price;

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-semibold text-white">New project</p>

      {/* Name */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Project name *</label>
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g. Score for short film"
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-accent/50"
        />
      </div>

      {/* Client */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Client</label>
        <Select
          value={form.clientId}
          onChange={(val) => set("clientId", val)}
          placeholder="No client"
          options={clients.map((c) => ({ value: c.id, label: c.name + (c.company ? ` · ${c.company}` : "") }))}
        />
        {clients.length === 0 && (
          <p className="text-[11px] text-amber-500/70 flex items-center gap-1">
            <Lock size={9} /> Optional. Add clients with Pro to track who pays you.
          </p>
        )}
      </div>

      {/* Type + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Project type</label>
          <Select
            value={form.projectTypeId}
            onChange={(val) => set("projectTypeId", val)}
            placeholder="Select…"
            options={projectTypes.map((pt) => ({ value: pt.id, label: pt.label }))}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-zinc-400">Agreed price *</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="0"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-accent/50"
          />
        </div>
      </div>

      {/* Deadline */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Delivery deadline</label>
        <input
          type="date"
          value={form.deadline}
          onChange={(e) => set("deadline", e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-accent/50"
          style={{ colorScheme: "dark" }}
        />
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <label className="text-xs text-zinc-400">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Deliverables, revisions, special requirements..."
          rows={2}
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-accent/50"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-zinc-400 transition hover:border-white/20"
        >
          Cancel
        </button>
        <button
          onClick={() => valid && onSave(form)}
          disabled={!valid}
          className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-black transition hover:bg-accent/90 disabled:opacity-40"
        >
          Save project
        </button>
      </div>
      <p className="text-[11px] text-zinc-500 flex items-center gap-1 pt-0.5">
        <Send size={9} className="text-amber-500/70" /> Send a quote &amp; get paid faster. Available on Pro
      </p>
    </div>
  );
}

// ─── Project card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onOpen,
  onAdvance,
  onRevert,
  onDelete,
}: {
  project: Project;
  onOpen: () => void;
  onAdvance: () => void;
  onRevert: () => void;
  onDelete: () => void;
}) {
  const meta   = STATUS_META[project.status];
  const StatusIcon = meta.icon;
  const dl     = deadlineInfo(project.deadline);
  const isPaid = project.status === "paid";
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { collected, pending } = projectMoney(project);
  const progress = deliverableProgress(project.deliverables);
  const money = (n: number) => formatMoney(n, (project.currency ?? getCurrency()) as Currency);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        {/* The title is the way in. Deliberately not a whole-card click: the
            card also holds delete and stage buttons, and nesting those inside
            a clickable region makes every tap a guess. */}
        <button
          onClick={onOpen}
          className="group min-w-0 text-left"
        >
          <p className="flex items-center gap-1.5 text-sm font-semibold leading-snug text-white transition group-hover:text-accent">
            <span className="truncate">{project.name}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 transition group-hover:text-accent" />
          </p>
          {project.clientName && (
            <p className="mt-0.5 text-xs text-zinc-500">{project.clientName}</p>
          )}
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onDelete}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded-lg px-2 py-1 text-[10px] font-semibold bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10 transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 rounded-lg p-1 text-zinc-600 transition hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap gap-2">
        {/* Status pill */}
        <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </span>

        {/* Deadline */}
        {project.deadline && (
          <span className={`flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium ${dl.color}`}>
            <Calendar className="h-3 w-3" />
            {dl.label}
          </span>
        )}

        {/* Type */}
        {project.projectTypeName && (
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-zinc-500">
            {project.projectTypeName}
          </span>
        )}

        {/* Deliverables progress — the answer to "how far along is this?" */}
        {progress.total > 0 && (
          <span
            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium ${
              progress.done === progress.total
                ? "bg-emerald-400/10 text-emerald-400"
                : "bg-white/5 text-zinc-400"
            }`}
          >
            <ListChecks className="h-3 w-3" />
            {progress.done}/{progress.total}
          </span>
        )}

        {/* Deposit status — the thing that was invisible before */}
        {!isPaid && collected > 0 && (
          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium text-emerald-400">
            {money(collected)} in
          </span>
        )}
        {!isPaid && collected === 0 && project.price > 0 && (
          <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-[10px] font-medium text-amber-400">
            No deposit yet
          </span>
        )}
      </div>

      {/* Notes */}
      {project.notes && (
        <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{project.notes}</p>
      )}

      {/* Bottom row — price + advance */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <div>
          <p className={`text-sm font-bold ${isPaid ? "text-emerald-400" : "text-white"}`}>
            {money(project.price)}
          </p>
          {!isPaid && pending > 0 && collected > 0 && (
            <p className="text-[10px] text-amber-400/80">{money(pending)} pending</p>
          )}
        </div>
        {!isPaid && (
          <div className="flex items-center gap-2">
            {prevStatus(project.status) !== null && project.status !== "in_progress" && (
              <button
                onClick={onRevert}
                className="group flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                title={`Back to ${STATUS_META[prevStatus(project.status)!].label}`}
              >
                <ChevronRight className="h-3 w-3 rotate-180 transition-colors group-hover:text-accent" />
                {STATUS_META[prevStatus(project.status)!].label}
              </button>
            )}
            <button
              onClick={onAdvance}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-accent/50 hover:text-accent"
            >
              Mark as {STATUS_META[nextStatus(project.status)].label}
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}
        {isPaid && (
          <span className="text-xs text-emerald-400 font-medium">✓ Closed</span>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ActiveProjects({ onBack, userId }: { onBack: () => void; userId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Timestamp of the last edit made on THIS device — see the realtime guard. */
  const lastLocalEdit = useRef(0);
  const writeTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingWrite  = useRef<Project | null>(null);

  // Load from Supabase
  useEffect(() => {
    Promise.all([getProjects(userId), getClients(userId)]).then(([p, c]) => {
      setProjects(p);
      setClients(c);
      setLoading(false);
    });
  }, [userId]);

  // Realtime sync — updates from other devices
  useEffect(() => {
    if (!userId) return;

    const projectsChannel = supabase
      .channel(`business_projects:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_projects', filter: `user_id=eq.${userId}` },
        () => {
          /* While the producer is typing in the detail view, THEY win. Every
             keystroke in Notes or the brief writes to Supabase, which echoes
             back here — refetching mid-sentence would replace the field with
             an older server row and eat characters. Same failure that ate
             digits in the pricing calculator (2026-08-01). */
          if (Date.now() - lastLocalEdit.current < LOCAL_EDIT_GUARD_MS) return;
          Promise.all([getProjects(userId), getClients(userId)]).then(([p, c]) => {
            setProjects(p);
            setClients(c);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(projectsChannel); };
  }, [userId]);

  const save = (updated: Project[]) => {
    setProjects(updated);
  };

  const handleSave = (form: FormState) => {
    const client = clients.find((c) => c.id === form.clientId);
    const pType  = projectTypes.find((pt) => pt.id === form.projectTypeId);
    const newProject: Project = {
      id:              crypto.randomUUID(),
      name:            form.name.trim(),
      clientId:        form.clientId,
      clientName:      client?.name ?? "",
      projectTypeId:   form.projectTypeId,
      projectTypeName: pType?.label ?? "",
      price:           Number(form.price) || 0,
      currency:        getCurrency(),
      deadline:        form.deadline,
      status:          "in_progress",
      notes:           form.notes.trim(),
      deliverables:    [],
      payments:        [],
      brief:           { ...EMPTY_BRIEF },
      createdAt:       Date.now(),
    };
    save([newProject, ...projects]);
    upsertProject(userId, newProject);
    setShowForm(false);
  };

  /* Any edit made inside the detail view. The screen has no Save button on
     purpose (a half-filled brief you forgot to save is worse than none), so
     state updates instantly and the WRITE is debounced — otherwise typing a
     note would fire one Supabase round trip per character. */
  const handleUpdate = (updated: Project) => {
    lastLocalEdit.current = Date.now();
    save(projects.map((p) => (p.id === updated.id ? updated : p)));

    pendingWrite.current = updated;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      const p = pendingWrite.current;
      if (p) { upsertProject(userId, p); pendingWrite.current = null; }
    }, WRITE_DEBOUNCE_MS);
  };

  /* Leaving the detail view must not drop an in-flight edit: the debounce
     timer would still be pending when the component stops rendering it. */
  const flushWrite = () => {
    if (writeTimer.current) { clearTimeout(writeTimer.current); writeTimer.current = null; }
    const p = pendingWrite.current;
    if (p) { upsertProject(userId, p); pendingWrite.current = null; }
  };
  useEffect(() => flushWrite, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Drop any debounced write before a status change. Both write the WHOLE row,
     and the queued one carries the pre-change status — letting it land 700ms
     later would silently undo the stage you just advanced to. Safe to drop:
     these handlers upsert from current state, so the pending edits ride along. */
  const cancelPendingWrite = () => {
    if (writeTimer.current) { clearTimeout(writeTimer.current); writeTimer.current = null; }
    pendingWrite.current = null;
  };

  const handleAdvance = (id: string) => {
    cancelPendingWrite();
    const updated = projects.map((p) => p.id === id ? { ...p, status: nextStatus(p.status) } : p);
    save(updated);
    const proj = updated.find((p) => p.id === id);
    if (proj) upsertProject(userId, proj);
  };

  /** Jump straight to a stage from the stepper. The stepper itself enforces
   *  which jumps are legal (back anywhere, forward one). */
  const handleSetStatus = (id: string, status: ProjectStatus) => {
    cancelPendingWrite();
    const updated = projects.map((p) => (p.id === id ? { ...p, status } : p));
    save(updated);
    const proj = updated.find((p) => p.id === id);
    if (proj) upsertProject(userId, proj);
  };

  const handleRevert = (id: string) => {
    cancelPendingWrite();
    const updated = projects.map((p) => {
      if (p.id !== id) return p;
      const prev = prevStatus(p.status);
      return prev ? { ...p, status: prev } : p;
    });
    save(updated);
    const proj = updated.find((p) => p.id === id);
    if (proj) upsertProject(userId, proj);
  };

  const handleDelete = (id: string) => {
    // Otherwise a queued write would resurrect the row right after the delete.
    cancelPendingWrite();
    save(projects.filter((p) => p.id !== id));
    deleteProject(userId, id);
  };

  // Group by status
  const active  = projects.filter((p) => p.status !== "paid");
  const paid    = projects.filter((p) => p.status === "paid");

  /* Stats. "Collected" used to mean "projects whose status says paid", which
     is a status flag, not money. It now means money actually logged as
     received, so the board can tell what's billed from what's in the bank. */
  const totalActive    = active.reduce((s, p) => s + p.price, 0);
  const totalCollected = projects.reduce((s, p) => s + paymentsTotal(p.payments), 0);
  const totalPending   = active.reduce((s, p) => s + projectMoney(p).pending, 0);

  const selected = selectedId ? projects.find((p) => p.id === selectedId) ?? null : null;
  if (selected) {
    const prev = prevStatus(selected.status);
    return (
      <ProjectDetail
        project={selected}
        statusMeta={STATUS_META[selected.status]}
        onBack={() => { flushWrite(); setSelectedId(null); }}
        onChange={handleUpdate}
        onAdvance={() => handleAdvance(selected.id)}
        onRevert={() => handleRevert(selected.id)}
        onSetStatus={(s) => handleSetStatus(selected.id, s)}
        nextLabel={selected.status === "paid" ? null : STATUS_META[nextStatus(selected.status)].label}
        prevLabel={prev ? STATUS_META[prev].label : null}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold tracking-widest text-accent uppercase">Business</p>
          <h1 className="text-2xl font-bold text-white">Active Projects</h1>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:bg-accent/90"
          >
            <Plus className="h-3.5 w-3.5" /> New
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* Summary cards */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="mb-1 text-xs text-zinc-500">In progress</p>
            <p className="text-lg font-bold text-white">{active.length}</p>
            <p className="mt-0.5 text-xs text-zinc-400">{formatCOP(totalActive)}</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="mb-1 text-xs text-zinc-500">Collected</p>
            <p className="text-lg font-bold text-emerald-400">{formatCOP(totalCollected)}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{paid.length} closed</p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="mb-1 text-xs text-zinc-500">Pending</p>
            <p className="text-lg font-bold text-amber-400">{formatCOP(totalPending)}</p>
            <p className="mt-0.5 text-xs text-zinc-500">owed to you</p>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <ProjectForm
          clients={clients}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Active projects */}
      {!loading && !showForm && active.length === 0 && paid.length === 0 && (
        <EmptyState onAdd={() => setShowForm(true)} />
      )}

      {!loading && active.length > 0 && (
        <div className="space-y-2">
          {active.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => setSelectedId(p.id)}
              onAdvance={() => handleAdvance(p.id)}
              onRevert={() => handleRevert(p.id)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}

      {/* Paid / closed */}
      {!loading && paid.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-600">Closed & Paid</p>
          {paid.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onOpen={() => setSelectedId(p.id)}
              onAdvance={() => handleAdvance(p.id)}
              onRevert={() => handleRevert(p.id)}
              onDelete={() => handleDelete(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
