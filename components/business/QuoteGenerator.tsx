"use client";

import { useState, useEffect, useMemo } from "react";
import { getCurrency, formatMoney } from "@/lib/currency";
import {
  ArrowLeft,
  FilePlus,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Pencil,
  FileText,
  XCircle,
  RotateCcw,
  ArrowRight,
} from "lucide-react";
import Select from "@/components/ui/Select";
import { PipelineStepper, type PipelineKey } from "@/components/business/PipelineStepper";
import {
  type Client,
  type Quote,
  type Project,
  projectTypes,
  formatCOP,
  QUOTE_STATUS_META,
  deliverablesFromQuote,
  EMPTY_BRIEF,
  itemsSubtotal,
  type QuoteItem,
  computePricing,
  syncPricingFromCloud,
} from "@/lib/pricingData";
import {
  getClients,
  getQuotes,
  upsertQuote,
  deleteQuote,
  upsertProject,
} from "@/lib/businessDb";
import { supabase } from "@/lib/supabase";

type Props = {
  onBack: () => void;
  onGoToClients: () => void;
  onGoToCalculator: () => void;
  onGoToProjects: () => void;
  userId: string;
};

const newItem = (): QuoteItem => ({ id: crypto.randomUUID(), concept: "", qty: 1, unitPrice: 0 });

const emptyForm = {
  projectName: "",
  projectTypeId: projectTypes[0].id,
  clientId: "",
  finalPrice: "",
  notes: "",
  /** The breakdown. One blank line to start so the shape is obvious. */
  items: [newItem()] as QuoteItem[],
  taxLabel: "",
  taxRate: 0,
};

export default function QuoteGenerator({
  onBack,
  onGoToClients,
  onGoToCalculator,
  onGoToProjects,
  userId,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  /** Quote being edited, or null when composing a new one. Edits save in
   *  place (no v2 versioning) — Paco 2026-07-31. */
  const [editingId, setEditingId] = useState<string | null>(null);
  /** Quote awaiting confirmation of an approval — approving can't be undone. */
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pricing, setPricing] = useState({ minPricePerProject: 0, isSetupComplete: false });

  // Load on mount
  useEffect(() => {
    setPricing(computePricing());
    // …then adopt the account-level setup if this device didn't have it.
    void syncPricingFromCloud().then(setPricing);
    Promise.all([getClients(userId), getQuotes(userId)]).then(([c, q]) => {
      setClients(c);
      setQuotes(q);
      setLoading(false);
    });
  }, [userId]);

  // Realtime sync — updates from other devices
  useEffect(() => {
    if (!userId) return;

    const quotesChannel = supabase
      .channel(`business_quotes:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_quotes', filter: `user_id=eq.${userId}` },
        () => {
          getQuotes(userId).then(setQuotes);
        }
      )
      .subscribe();

    const clientsChannel = supabase
      .channel(`business_clients_qg:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_clients', filter: `user_id=eq.${userId}` },
        () => {
          getClients(userId).then(setClients);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(quotesChannel);
      supabase.removeChannel(clientsChannel);
    };
  }, [userId]);

  // Computed prices for current form
  const activeProjectType = useMemo(
    () => projectTypes.find((p) => p.id === form.projectTypeId) ?? projectTypes[0],
    [form.projectTypeId],
  );
  const minPrice = pricing.minPricePerProject;
  const recommendedPrice = minPrice * activeProjectType.multiplier;

  // When project type changes, update the final price suggestion
  const handleProjectTypeChange = (id: string) => {
    const pt = projectTypes.find((p) => p.id === id) ?? projectTypes[0];
    const newRecommended = Math.round(minPrice * pt.multiplier);
    setForm((prev) => ({
      ...prev,
      projectTypeId: id,
      finalPrice: newRecommended > 0 ? String(newRecommended) : prev.finalPrice,
    }));
  };

  const openForm = () => {
    const defaultFinal = Math.round(recommendedPrice);
    setForm({
      ...emptyForm,
      finalPrice: defaultFinal > 0 ? String(defaultFinal) : "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const selectedClient = clients.find((c) => c.id === form.clientId);
  // The total is derived from the breakdown, never typed: two sources of
  // truth for a client-facing number is how a quote goes out wrong.
  const subtotal = itemsSubtotal(form.items);
  const taxAmount = subtotal * (form.taxRate || 0);
  const finalPriceNum = subtotal + taxAmount;
  const isBelowMin = finalPriceNum > 0 && finalPriceNum < minPrice;
  const canSave =
    form.projectName.trim() &&
    form.clientId &&
    subtotal > 0 &&
    form.items.some((it) => it.concept.trim()) &&
    pricing.isSetupComplete;

  function startEdit(quote: Quote) {
    setEditingId(quote.id);
    setForm({
      projectName: quote.projectName,
      projectTypeId: quote.projectTypeId || projectTypes[0].id,
      clientId: quote.clientId,
      finalPrice: String(quote.finalPrice),
      notes: quote.notes ?? "",
      // Legacy quotes have no breakdown: seed one concept from the old total
      // so editing them is the moment they gain a real breakdown.
      items: quote.items?.length
        ? quote.items.map((it) => ({ ...it }))
        : [{ id: crypto.randomUUID(), concept: quote.projectName || "Project", qty: 1, unitPrice: quote.finalPrice }],
      taxLabel: quote.taxLabel ?? "",
      taxRate: quote.taxRate ?? 0,
    });
    setShowForm(true);
  }

  const handleSave = () => {
    if (!canSave || !selectedClient) return;

    const existing = editingId ? quotes.find((q) => q.id === editingId) : null;

    const newQuote: Quote = {
      // Editing keeps the identity: same id, original creation date and status.
      id: existing?.id ?? crypto.randomUUID(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      projectName: form.projectName.trim(),
      projectTypeId: activeProjectType.id,
      projectTypeName: activeProjectType.label,
      minPrice,
      recommendedPrice,
      finalPrice: finalPriceNum,
      items: form.items.filter((it) => it.concept.trim() && it.unitPrice > 0),
      taxLabel: form.taxLabel.trim(),
      taxRate: form.taxRate || 0,
      currency: getCurrency(),
      notes: form.notes.trim(),
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: existing ? Date.now() : undefined,
      status: existing?.status ?? "draft",
    };

    // Optimistic update — replace in place when editing, prepend when new.
    setQuotes((prev) => existing
      ? prev.map((q) => (q.id === newQuote.id ? newQuote : q))
      : [newQuote, ...prev]);
    upsertQuote(userId, newQuote);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = (id: string) => {
    // Optimistic update
    setQuotes((prev) => prev.filter((q) => q.id !== id));
    deleteQuote(userId, id);
  };

  const makeProject = (quote: Quote): Project => ({
    id:              crypto.randomUUID(),
    name:            quote.projectName,
    clientId:        quote.clientId,
    clientName:      quote.clientName,
    projectTypeId:   quote.projectTypeId,
    projectTypeName: quote.projectTypeName,
    price:           quote.finalPrice,
    // Frozen with the quote's own currency, not today's setting.
    currency:        quote.currency,
    deadline:        "",
    status:          "in_progress",
    notes:           "",
    // What you charged for is what you owe: the quote's line items become the
    // project's checklist, so the two can never drift apart.
    deliverables:    deliverablesFromQuote(quote),
    payments:        [],
    brief:           { ...EMPTY_BRIEF },
    quoteId:         quote.id,
    createdAt:       Date.now(),
  });

  /** Move a quote along the pipeline. Every hop is a deliberate click — the
   *  app must never decide on the producer's behalf that a client said yes. */
  const setQuoteStatus = (quote: Quote, status: Quote["status"]) => {
    const updated: Quote = { ...quote, status };
    setQuotes((prev) => prev.map((q) => (q.id === quote.id ? updated : q)));
    upsertQuote(userId, updated);
  };

  /* Client approved → the quote becomes a real project, in_progress.
     This is the ONLY path that creates a project. Sending a quote used to do
     it silently, so two unpaid quotes read as $130,632 of active work
     (Paco 2026-08-01). */
  const handleApprove = async (quote: Quote) => {
    if (quote.projectId) { onGoToProjects(); return; }   // already converted
    const newProject = { ...makeProject(quote), notes: quote.notes };
    const updated: Quote = {
      ...quote,
      status: "approved",
      approvedAt: Date.now(),
      projectId: newProject.id,
    };
    setQuotes((prev) => prev.map((q) => (q.id === quote.id ? updated : q)));
    await Promise.all([
      upsertProject(userId, newProject),
      upsertQuote(userId, updated),
    ]);
    onGoToProjects();
  };

  const handleSendEmail = (quote: Quote) => {
    const subject = encodeURIComponent(
      `Music Production Quote – ${quote.projectName}`,
    );
    const body = encodeURIComponent(
      `Hi ${quote.clientName},\n\nPlease find below the quote for your project.\n\n` +
        `────────────────────────\n` +
        `Project: ${quote.projectName}\n` +
        `Type: ${quote.projectTypeName}\n` +
        `Quoted price: ${formatCOP(quote.finalPrice)}\n` +
        (quote.notes ? `\nNotes:\n${quote.notes}\n` : "") +
        `────────────────────────\n\n` +
        `Let me know if you have any questions.\n\nBest,`,
    );
    window.open(`mailto:${quote.clientEmail}?subject=${subject}&body=${body}`);

    // Sending advances the quote to `sent` and NOTHING else. A project is born
    // only when the client actually approves — see handleApprove.
    if (quote.status === "draft") setQuoteStatus(quote, "sent");
  };

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(ts));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs text-zinc-400 transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Business
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase">
            Quote Generator
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Create a quote.
          </h1>
          <p className="text-sm text-zinc-400">
            Price your project and send it directly to your client.
          </p>
        </div>
        {pricing.isSetupComplete && !showForm && (
          <button
            onClick={openForm}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <FilePlus className="h-4 w-4" />
            New quote
          </button>
        )}
      </div>

      {/* Warning: pricing not set up */}
      {!pricing.isSetupComplete && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-white">
              Set up your pricing first
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              The Quote Generator uses your Pricing Calculator to set minimum
              rates.
            </p>
            <button
              onClick={onGoToCalculator}
              className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
            >
              Open Pricing Calculator
            </button>
          </div>
        </div>
      )}

      {/* Saved toast */}
      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          <CheckCircle2 className="h-4 w-4" />
          Quote saved — ready to send.
        </div>
      )}

      {/* New quote form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">{editingId ? "Edit quote" : "New quote"}</h2>

          {/* Project name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Project name *</span>
            <input
              type="text"
              placeholder="Original Soundtrack – Short Film"
              value={form.projectName}
              onChange={(e) =>
                setForm((p) => ({ ...p, projectName: e.target.value }))
              }
              className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
          </label>

          {/* Project type */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Project type *</span>
            <Select
              value={form.projectTypeId}
              onChange={handleProjectTypeChange}
              options={projectTypes.map((pt) => ({ value: pt.id, label: pt.label }))}
            />
          </label>

          {/* Pricing info */}
          {pricing.isSetupComplete && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
              <div>
                <p className="text-xs text-zinc-500">Minimum price</p>
                <p className="mt-0.5 text-sm font-semibold text-zinc-300">
                  {formatCOP(minPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">Recommended</p>
                <p className="mt-0.5 text-sm font-semibold text-accent">
                  {formatCOP(recommendedPrice)}
                </p>
              </div>
            </div>
          )}

          {/* Breakdown — a producer quotes a bundle (main track + variation +
              rush), so the client needs the concepts, not one lump number.
              The total is computed from these lines. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Breakdown *</span>
            <div className="flex flex-col gap-1.5">
              {form.items.map((it, i) => (
                <div key={it.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder={i === 0 ? "Main soundtrack" : "Concept"}
                    value={it.concept}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      items: p.items.map((x) => x.id === it.id ? { ...x, concept: e.target.value } : x),
                    }))}
                    className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
                  />
                  <input
                    type="number" min="1" step="1" aria-label="Quantity"
                    value={it.qty}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      items: p.items.map((x) => x.id === it.id ? { ...x, qty: Number(e.target.value) || 1 } : x),
                    }))}
                    className="h-10 w-14 flex-shrink-0 rounded-xl border border-white/15 bg-black/30 px-2 text-center text-sm text-white outline-none focus:border-accent"
                  />
                  <input
                    type="number" min="0" step="1000" placeholder="0" aria-label="Unit price"
                    value={it.unitPrice || ""}
                    onChange={(e) => setForm((p) => ({
                      ...p,
                      items: p.items.map((x) => x.id === it.id ? { ...x, unitPrice: Number(e.target.value) || 0 } : x),
                    }))}
                    className="h-10 w-28 flex-shrink-0 rounded-xl border border-white/15 bg-black/30 px-3 text-right text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
                  />
                  <button
                    type="button"
                    aria-label="Remove concept"
                    disabled={form.items.length === 1}
                    onClick={() => setForm((p) => ({ ...p, items: p.items.filter((x) => x.id !== it.id) }))}
                    className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:text-white disabled:opacity-25"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setForm((p) => ({ ...p, items: [...p.items, newItem()] }))}
              className="self-start text-xs font-semibold text-accent transition hover:brightness-110"
            >
              + Add concept
            </button>
          </div>

          {/* Tax — label and rate are free: IVA in Mexico, IVA 19% in Colombia,
              or none at all. Never hardcode 16%. */}
          <div className="flex items-end gap-1.5">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs text-zinc-400">Tax label</span>
              <input
                type="text" placeholder="IVA (optional)"
                value={form.taxLabel}
                onChange={(e) => setForm((p) => ({ ...p, taxLabel: e.target.value }))}
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
              />
            </label>
            <label className="flex w-24 flex-col gap-1.5">
              <span className="text-xs text-zinc-400">Rate %</span>
              <input
                type="number" min="0" max="100" step="1" placeholder="0"
                value={form.taxRate ? Math.round(form.taxRate * 100) : ""}
                onChange={(e) => setForm((p) => ({ ...p, taxRate: (Number(e.target.value) || 0) / 100 }))}
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-right text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
              />
            </label>
          </div>

          {/* Running total — the number the client will see */}
          <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-zinc-500">Subtotal</span>
              <span className="tabular-nums text-zinc-300">{formatMoney(subtotal)}</span>
            </div>
            {form.taxRate > 0 && (
              <div className="mt-1 flex items-baseline justify-between text-[13px]">
                <span className="text-zinc-500">{form.taxLabel || "Tax"} {Math.round(form.taxRate * 100)}%</span>
                <span className="tabular-nums text-zinc-300">{formatMoney(taxAmount)}</span>
              </div>
            )}
            <div className="mt-2 flex items-baseline justify-between border-t border-white/10 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500">Total · {getCurrency()}</span>
              <span className="text-[19px] font-extrabold tabular-nums text-accent">{formatMoney(finalPriceNum)}</span>
            </div>
            {isBelowMin && (
              <p className="mt-2 text-xs text-red-400">
                Below your minimum rate ({formatMoney(minPrice)})
              </p>
            )}
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Client *</span>
            {clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-500">No clients saved yet.</p>
                <button
                  onClick={onGoToClients}
                  className="mt-2 text-xs text-accent underline-offset-2 hover:underline"
                >
                  Add a client first →
                </button>
              </div>
            ) : (
              <Select
                value={form.clientId}
                onChange={(val) => setForm((p) => ({ ...p, clientId: val }))}
                placeholder="Select a client"
                options={clients.map((c) => ({ value: c.id, label: c.name + (c.company ? ` — ${c.company}` : "") }))}
              />
            )}
          </div>

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Notes (optional)</span>
            <textarea
              placeholder="Deliverables, deadlines, revisions included..."
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              rows={3}
              className="resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={cancelForm}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Save quote
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
        </div>
      )}

      {/* No quotes yet */}
      {!loading && quotes.length === 0 && !showForm && pricing.isSetupComplete && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-sm text-zinc-500">No quotes yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create your first quote and send it to a client in seconds.
          </p>
        </div>
      )}

      {/* Quotes list */}
      {!loading && quotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Saved quotes
          </h2>
          {quotes.map((quote) => (
            <div
              key={quote.id}
              className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: info */}
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white truncate">
                      {quote.projectName}
                    </p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                        QUOTE_STATUS_META[quote.status].bg
                      } ${QUOTE_STATUS_META[quote.status].color}`}
                    >
                      {QUOTE_STATUS_META[quote.status].label}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {quote.clientName} · {quote.projectTypeName}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {quote.updatedAt ? `Updated ${formatDate(quote.updatedAt)}` : formatDate(quote.createdAt)}
                  </p>
                </div>

                {/* Right: price + actions */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-sm font-bold text-accent">
                    {formatCOP(quote.finalPrice)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => window.open(`/quote/${quote.id}/print`, "_blank")}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      title="Open the client-ready PDF"
                    >
                      <FileText className="h-3 w-3" />
                      PDF
                    </button>
                    <button
                      onClick={() => startEdit(quote)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      title="Edit this quote"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleSendEmail(quote)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      title="Email this quote to the client"
                    >
                      <Send className="h-3 w-3" />
                      {quote.status === "draft" ? "Send" : "Resend"}
                    </button>
                    <button
                      onClick={() => handleDelete(quote.id)}
                      className="rounded-lg border border-white/10 p-1.5 text-zinc-600 transition hover:border-red-400/30 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Pipeline row ──
                  Separate from the tools above because these are the decisions
                  that move money: what the client actually answered. Only the
                  hops that are legal from the current stage are shown, so the
                  card reads as "here's what can happen next". */}
              {/* The whole run, seen from the quote. Project stages show ahead
                  but aren't reachable here — they belong to the project. */}
              {quote.status !== "declined" && (
                <div className="mt-3 border-t border-white/5 pt-3">
                  <PipelineStepper
                    current={quote.status as PipelineKey}
                    canSelect={(key) =>
                      // Only the quote's own stages, and only from a live quote.
                      (quote.status === "draft" || quote.status === "sent") &&
                      (key === "draft" || key === "sent" || key === "approved") &&
                      key !== quote.status
                    }
                    onSelect={(key) => {
                      if (key === "approved") { setConfirmApproveId(quote.id); return; }
                      setQuoteStatus(quote, key as Quote["status"]);
                    }}
                  />
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
                {quote.status === "draft" && (
                  <button
                    onClick={() => setQuoteStatus(quote, "sent")}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-amber-400/50 hover:text-amber-400"
                    title="You sent it another way (WhatsApp, PDF, in person)"
                  >
                    <Send className="h-3 w-3" />
                    Mark as sent
                  </button>
                )}

                {(quote.status === "draft" || quote.status === "sent") && (
                  <>
                    {/* Neutral until hovered, on purpose. A filled emerald button
                        read as the APPROVED state itself (that's what the status
                        pill uses), so a quote you'd just written looked already
                        approved. Green is a state in this module, not an action.
                        Label follows the module's verb pattern — "Mark as sent",
                        "Mark as In Review" — so it reads as something you do. */}
                    {confirmApproveId === quote.id ? (
                      /* Two-step, because approving is not undoable: it creates
                         the project and locks the quote to it. Same pattern the
                         delete button already uses in this module. */
                      <span className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">Start the project?</span>
                        <button
                          onClick={() => { setConfirmApproveId(null); handleApprove(quote); }}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-500/30"
                        >
                          Yes, approved
                        </button>
                        <button
                          onClick={() => setConfirmApproveId(null)}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:border-white/20"
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmApproveId(quote.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-400"
                        title="The client said yes. This starts the project."
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Mark as approved
                      </button>
                    )}
                    <button
                      onClick={() => setQuoteStatus(quote, "declined")}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:border-red-400/40 hover:text-red-400"
                      title="The client passed on this quote"
                    >
                      <XCircle className="h-3 w-3" />
                      Declined
                    </button>
                  </>
                )}

                {quote.status === "approved" && (
                  <>
                    <span className="text-xs text-emerald-400/80">
                      Approved{quote.approvedAt ? ` · ${formatDate(quote.approvedAt)}` : ""}
                    </span>
                    <button
                      onClick={onGoToProjects}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                    >
                      <ArrowRight className="h-3 w-3" />
                      View project
                    </button>
                  </>
                )}

                {quote.status === "declined" && (
                  <button
                    onClick={() => setQuoteStatus(quote, "sent")}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-accent/50 hover:text-accent"
                    title="They came back — put it back in play"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Reopen
                  </button>
                )}
              </div>

              {/* Notes preview */}
              {quote.notes && (
                <p className="mt-3 border-t border-white/5 pt-3 text-xs text-zinc-500 line-clamp-2">
                  {quote.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
