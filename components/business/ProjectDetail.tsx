"use client";

/* ═══════════════════════════════════════════════════════════════
   PROJECT DETAIL

   A project used to be a name, a price and a date — everything a
   composer actually needs mid-job lived somewhere else. The
   deliverables were in the quote PDF, the deposit was in a banking
   app, and the client's reference tracks were in WhatsApp.

   Three sections, in the order they matter when you open a job:
     Money        · billed vs collected vs pending
     Deliverables · the approved quote's line items, as a checklist
     Brief        · references (with WHY), genre, mood, formats

   Every edit persists immediately through onChange — no Save
   button, because a half-filled brief you forgot to save is worse
   than no brief.
   ═══════════════════════════════════════════════════════════════ */

import { useState } from "react";
import {
  ChevronLeft, Plus, X, Check, Banknote, ListChecks,
  Music2, ExternalLink, Trash2, Calendar,
} from "lucide-react";
import {
  type Project, type Deliverable, type Payment, type ProjectReference,
  projectMoney, deliverableProgress, EMPTY_BRIEF,
} from "@/lib/pricingData";
import { formatMoney, getCurrency, type Currency } from "@/lib/currency";
import {
  PipelineStepper, PIPELINE, pipelineIndex, type PipelineKey,
} from "@/components/business/PipelineStepper";

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Section({
  icon: Icon, title, hint, right, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        {right}
      </div>
      {hint && <p className="-mt-1 text-[11px] leading-relaxed text-zinc-500">{hint}</p>}
      {children}
    </section>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-accent/50";

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] text-zinc-400">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={inputCls}
      />
    </div>
  );
}

/** Hostname only, so a 90-character Spotify URL reads as "open.spotify.com". */
function prettyUrl(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

/** Accepts "spotify.com/..." without a scheme so pasting is forgiving. */
function normalizeUrl(url: string): string {
  const u = url.trim();
  if (!u) return "";
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}

// ─── Money ────────────────────────────────────────────────────────────────────

function MoneySection({
  project, currency, onChange,
}: {
  project: Project; currency: Currency; onChange: (p: Project) => void;
}) {
  const { price, collected, pending } = projectMoney(project);
  const [adding, setAdding] = useState(false);
  const [amount, setAmount] = useState("");
  const [label, setLabel]   = useState("");
  const [date, setDate]     = useState(() => new Date().toISOString().slice(0, 10));

  const [editingPrice, setEditingPrice] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");

  const commitPrice = () => {
    const value = Number(priceDraft);
    // A blank or nonsense entry keeps the old price rather than zeroing the job.
    if (Number.isFinite(value) && value >= 0 && priceDraft.trim() !== "") {
      onChange({ ...project, price: value });
    }
    setEditingPrice(false);
  };

  const payments = project.payments ?? [];
  const pct = price > 0 ? Math.min(100, (collected / price) * 100) : 0;

  const addPayment = () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const payment: Payment = {
      id: crypto.randomUUID(),
      amount: value,
      date,
      label: label.trim() || (payments.length === 0 ? "Deposit" : "Payment"),
    };
    onChange({ ...project, payments: [...payments, payment] });
    setAmount(""); setLabel(""); setAdding(false);
  };

  const removePayment = (id: string) =>
    onChange({ ...project, payments: payments.filter((p) => p.id !== id) });

  return (
    <Section
      icon={Banknote}
      title="Money"
      right={
        !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-accent/50 hover:text-accent"
          >
            <Plus className="h-3 w-3" /> Log payment
          </button>
        )
      }
    >
      {/* Three numbers, because one can't tell "billed" from "in the bank" */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Agreed</p>
          {/* Editable: scope changes mid-job, and the price was previously
              locked once the project existed. */}
          {editingPrice ? (
            <input
              type="number"
              inputMode="decimal"
              autoFocus
              value={priceDraft}
              onChange={(e) => setPriceDraft(e.target.value)}
              onBlur={commitPrice}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitPrice();
                if (e.key === "Escape") { setPriceDraft(String(price)); setEditingPrice(false); }
              }}
              className="mt-0.5 w-full rounded-lg border border-accent/50 bg-black/30 px-2 py-1 text-sm font-bold text-white outline-none"
            />
          ) : (
            <button
              onClick={() => { setPriceDraft(String(price)); setEditingPrice(true); }}
              className="mt-0.5 text-sm font-bold text-white transition hover:text-accent"
              title="Edit the agreed price"
            >
              {formatMoney(price, currency)}
            </button>
          )}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Collected</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-400">{formatMoney(collected, currency)}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-zinc-500">Pending</p>
          <p className={`mt-0.5 text-sm font-bold ${pending > 0 ? "text-amber-400" : "text-zinc-500"}`}>
            {formatMoney(pending, currency)}
          </p>
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-emerald-400/70 transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {adding && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              autoFocus
              className={inputCls}
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
              style={{ colorScheme: "dark" }}
            />
          </div>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={payments.length === 0 ? "Deposit" : "Second installment"}
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setAmount(""); setLabel(""); }}
              className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-semibold text-zinc-400 transition hover:border-white/20"
            >
              Cancel
            </button>
            <button
              onClick={addPayment}
              disabled={!Number(amount)}
              className="flex-1 rounded-xl bg-accent py-2 text-xs font-semibold text-black transition hover:bg-accent/90 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {payments.length > 0 && (
        <ul className="divide-y divide-white/5 border-t border-white/5">
          {payments.map((p) => (
            <li key={p.id} className="group flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{p.label}</p>
                <p className="text-[11px] text-zinc-500">{p.date}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs font-semibold text-emerald-400">
                  {formatMoney(p.amount, currency)}
                </span>
                <button
                  onClick={() => removePayment(p.id)}
                  aria-label={`Remove ${p.label}`}
                  className="rounded p-1 text-zinc-700 transition hover:text-red-400 group-hover:text-zinc-500"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {payments.length === 0 && !adding && (
        <p className="text-[11px] text-zinc-600">
          Nothing collected yet. Log the deposit when it lands.
        </p>
      )}
    </Section>
  );
}

// ─── Deliverables ─────────────────────────────────────────────────────────────

function DeliverablesSection({
  project, onChange,
}: {
  project: Project; onChange: (p: Project) => void;
}) {
  const items = project.deliverables ?? [];
  const { done, total } = deliverableProgress(items);
  const [adding, setAdding] = useState(false);
  const [concept, setConcept] = useState("");

  const toggle = (id: string) =>
    onChange({
      ...project,
      deliverables: items.map((d) =>
        d.id === id ? { ...d, done: !d.done, doneAt: d.done ? undefined : Date.now() } : d,
      ),
    });

  const add = () => {
    const text = concept.trim();
    if (!text) return;
    const d: Deliverable = { id: crypto.randomUUID(), concept: text, qty: 1, done: false };
    onChange({ ...project, deliverables: [...items, d] });
    setConcept(""); setAdding(false);
  };

  const remove = (id: string) =>
    onChange({ ...project, deliverables: items.filter((d) => d.id !== id) });

  return (
    <Section
      icon={ListChecks}
      title="Deliverables"
      hint={
        project.quoteId
          ? "Copied from the approved quote. What you charged for is what you owe."
          : undefined
      }
      right={
        <div className="flex items-center gap-2">
          {total > 0 && (
            <span className="text-[11px] font-medium text-zinc-500">{done}/{total}</span>
          )}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-accent/50 hover:text-accent"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          )}
        </div>
      }
    >
      {total > 0 && (
        <ul className="space-y-1">
          {items.map((d) => (
            <li key={d.id} className="group flex items-center gap-3">
              <button
                onClick={() => toggle(d.id)}
                aria-pressed={d.done}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  d.done
                    ? "border-emerald-400/50 bg-emerald-400/20 text-emerald-400"
                    : "border-white/15 text-transparent hover:border-accent/50"
                }`}
              >
                <Check className="h-3 w-3" />
              </button>
              <span
                className={`flex-1 text-xs leading-relaxed transition ${
                  d.done ? "text-zinc-600 line-through" : "text-zinc-200"
                }`}
              >
                {d.concept}
                {d.qty > 1 && <span className="text-zinc-600"> × {d.qty}</span>}
              </span>
              <button
                onClick={() => remove(d.id)}
                aria-label={`Remove ${d.concept}`}
                className="shrink-0 rounded p-1 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="flex gap-2">
          <input
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
            placeholder="e.g. 30s cutdown"
            autoFocus
            className={inputCls}
          />
          <button
            onClick={add}
            disabled={!concept.trim()}
            className="shrink-0 rounded-xl bg-accent px-4 text-xs font-semibold text-black transition hover:bg-accent/90 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}

      {total === 0 && !adding && (
        <p className="text-[11px] text-zinc-600">
          {project.quoteId
            ? "This project came from a quote with no line items. Add what you owe."
            : "Nothing listed yet. Add what you owe the client."}
        </p>
      )}
    </Section>
  );
}

// ─── Brief ────────────────────────────────────────────────────────────────────

function BriefSection({
  project, onChange,
}: {
  project: Project; onChange: (p: Project) => void;
}) {
  const brief = { ...EMPTY_BRIEF, ...(project.brief ?? {}) };
  const refs = brief.references ?? [];
  const [adding, setAdding] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const setBrief = (patch: Partial<typeof brief>) =>
    onChange({ ...project, brief: { ...brief, ...patch } });

  const addRef = () => {
    const clean = normalizeUrl(url);
    if (!clean && !title.trim()) return;
    const r: ProjectReference = {
      id: crypto.randomUUID(),
      url: clean,
      title: title.trim() || prettyUrl(clean),
      note: note.trim(),
    };
    setBrief({ references: [...refs, r] });
    setUrl(""); setTitle(""); setNote(""); setAdding(false);
  };

  const removeRef = (id: string) =>
    setBrief({ references: refs.filter((r) => r.id !== id) });

  return (
    <Section
      icon={Music2}
      title="Creative brief"
      hint="What the client asked for, in one place instead of scattered across a chat thread."
      right={
        !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:border-accent/50 hover:text-accent"
          >
            <Plus className="h-3 w-3" /> Reference
          </button>
        )
      }
    >
      {/* References first — they're the thing you actually reopen a job for */}
      {refs.length > 0 && (
        <ul className="space-y-2">
          {refs.map((r) => (
            <li
              key={r.id}
              className="group flex items-start gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-xs font-medium text-white">{r.title}</p>
                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-zinc-600 transition hover:text-accent"
                      aria-label={`Open ${r.title}`}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {r.url && <p className="truncate text-[10px] text-zinc-600">{prettyUrl(r.url)}</p>}
                {r.note && (
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">{r.note}</p>
                )}
              </div>
              <button
                onClick={() => removeRef(r.id)}
                aria-label={`Remove ${r.title}`}
                className="shrink-0 rounded p-1 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a Spotify or YouTube link"
            autoFocus
            className={inputCls}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Track name (optional)"
            className={inputCls}
          />
          {/* The note is the whole point: "like this" is useless three weeks later */}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addRef(); }}
            placeholder="What to take from it — e.g. the drums, not the vocal"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={() => { setAdding(false); setUrl(""); setTitle(""); setNote(""); }}
              className="flex-1 rounded-xl border border-white/10 py-2 text-xs font-semibold text-zinc-400 transition hover:border-white/20"
            >
              Cancel
            </button>
            <button
              onClick={addRef}
              disabled={!url.trim() && !title.trim()}
              className="flex-1 rounded-xl bg-accent py-2 text-xs font-semibold text-black transition hover:bg-accent/90 disabled:opacity-40"
            >
              Add reference
            </button>
          </div>
        </div>
      )}

      {refs.length === 0 && !adding && (
        <p className="text-[11px] text-zinc-600">
          No references yet. Add the tracks the client sent as &ldquo;make it like this&rdquo;.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
        <Field label="Genre"     value={brief.genre}      onChange={(v) => setBrief({ genre: v })}      placeholder="Orchestral, indie pop…" />
        <Field label="Mood"      value={brief.mood}       onChange={(v) => setBrief({ mood: v })}       placeholder="Hopeful, tense…" />
        <Field label="Tempo"     value={brief.tempo}      onChange={(v) => setBrief({ tempo: v })}      placeholder="≈ 92 BPM" />
        <Field label="Key"       value={brief.musicalKey} onChange={(v) => setBrief({ musicalKey: v })} placeholder="D minor" />
      </div>
      <Field
        label="Instrumentation"
        value={brief.instrumentation}
        onChange={(v) => setBrief({ instrumentation: v })}
        placeholder="Strings, piano, light percussion"
      />
      <Field
        label="Formats needed"
        value={brief.formats}
        onChange={(v) => setBrief({ formats: v })}
        placeholder="60s, 30s, 15s, stems, instrumental"
      />
    </Section>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function ProjectDetail({
  project, statusMeta, onBack, onChange, onAdvance, onRevert, onSetStatus,
  nextLabel, prevLabel,
}: {
  project: Project;
  statusMeta: { label: string; color: string; bg: string; icon: React.ComponentType<{ className?: string }> };
  onBack: () => void;
  onChange: (p: Project) => void;
  onAdvance: () => void;
  onRevert: () => void;
  onSetStatus: (s: Project["status"]) => void;
  nextLabel: string | null;
  prevLabel: string | null;
}) {
  const currency = (project.currency ?? getCurrency()) as Currency;
  const StatusIcon = statusMeta.icon;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={onBack}
          aria-label="Back to projects"
          className="rounded-xl p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">Project</p>
          <h1 className="truncate text-2xl font-bold text-white">{project.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
              <StatusIcon className="h-3 w-3" />
              {statusMeta.label}
            </span>
            {project.clientName && (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-zinc-400">
                {project.clientName}
              </span>
            )}
            {project.projectTypeName && (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] text-zinc-500">
                {project.projectTypeName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Same seven stages as the quote screen, seen from the other end: the
          quote's stages read as already done. They're not selectable — going
          back across that boundary would orphan this project. */}
      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <PipelineStepper
          current={project.status as PipelineKey}
          canSelect={(key) => {
            const step = PIPELINE.find((s) => s.key === key);
            if (!step || step.owner !== "project") return false;
            const idx = pipelineIndex(key);
            const cur = pipelineIndex(project.status as PipelineKey);
            // Backwards anywhere, forwards one at a time.
            return idx !== cur && idx <= cur + 1;
          }}
          onSelect={(key) => onSetStatus(key as Project["status"])}
        />
      </div>

      {/* Deadline lives up top: it's the thing that changes what you do today */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-3">
        <Calendar className="h-4 w-4 shrink-0 text-accent" />
        <label className="text-[11px] text-zinc-400">Delivery date</label>
        <input
          type="date"
          value={project.deadline || ""}
          onChange={(e) => onChange({ ...project, deadline: e.target.value })}
          className="ml-auto rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white outline-none transition focus:border-accent/50"
          style={{ colorScheme: "dark" }}
        />
      </div>

      <MoneySection project={project} currency={currency} onChange={onChange} />
      <DeliverablesSection project={project} onChange={onChange} />
      <BriefSection project={project} onChange={onChange} />

      {/* Notes */}
      <section className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-sm font-semibold text-white">Notes</h2>
        <textarea
          value={project.notes}
          onChange={(e) => onChange({ ...project, notes: e.target.value })}
          rows={3}
          placeholder="Anything that doesn't fit above."
          className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-accent/50"
        />
      </section>

      {/* Stage controls */}
      {(prevLabel || nextLabel) && (
        <div className="flex items-center justify-between gap-2">
          {prevLabel ? (
            <button
              onClick={onRevert}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-medium text-zinc-400 transition hover:border-accent/50 hover:text-accent"
            >
              Back to {prevLabel}
            </button>
          ) : <span />}
          {nextLabel && (
            <button
              onClick={onAdvance}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-accent/90"
            >
              Mark as {nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
