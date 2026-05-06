"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  FilePlus,
  Send,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import {
  type Client,
  type Quote,
  type Project,
  CLIENTS_STORAGE_KEY,
  QUOTES_STORAGE_KEY,
  PROJECTS_STORAGE_KEY,
  projectTypes,
  formatCOP,
  computePricing,
} from "@/lib/pricingData";

type Props = {
  onBack: () => void;
  onGoToClients: () => void;
  onGoToCalculator: () => void;
  onGoToProjects: () => void;
};

const emptyForm = {
  projectName: "",
  projectTypeId: projectTypes[0].id,
  clientId: "",
  finalPrice: "",
  notes: "",
};

export default function QuoteGenerator({
  onBack,
  onGoToClients,
  onGoToCalculator,
  onGoToProjects,
}: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [pricing, setPricing] = useState({ minPricePerProject: 0, isSetupComplete: false });

  // Load on mount
  useEffect(() => {
    setPricing(computePricing());
    try {
      const rawClients = localStorage.getItem(CLIENTS_STORAGE_KEY);
      if (rawClients) setClients(JSON.parse(rawClients) as Client[]);
      const rawQuotes = localStorage.getItem(QUOTES_STORAGE_KEY);
      if (rawQuotes) setQuotes(JSON.parse(rawQuotes) as Quote[]);
    } catch {}
  }, []);

  // Persist quotes
  useEffect(() => {
    localStorage.setItem(QUOTES_STORAGE_KEY, JSON.stringify(quotes));
  }, [quotes]);

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
    setForm(emptyForm);
  };

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const finalPriceNum = Number(form.finalPrice) || 0;
  const isBelowMin = finalPriceNum > 0 && finalPriceNum < minPrice;
  const canSave =
    form.projectName.trim() &&
    form.clientId &&
    finalPriceNum > 0 &&
    pricing.isSetupComplete;

  const handleSave = () => {
    if (!canSave || !selectedClient) return;

    const newQuote: Quote = {
      id: crypto.randomUUID(),
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientEmail: selectedClient.email,
      projectName: form.projectName.trim(),
      projectTypeId: activeProjectType.id,
      projectTypeName: activeProjectType.label,
      minPrice,
      recommendedPrice,
      finalPrice: finalPriceNum,
      notes: form.notes.trim(),
      createdAt: Date.now(),
      status: "draft",
    };

    setQuotes((prev) => [newQuote, ...prev]);
    setShowForm(false);
    setForm(emptyForm);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = (id: string) => {
    setQuotes((prev) => prev.filter((q) => q.id !== id));
  };

  const handleConvertToProject = (quote: Quote) => {
    const existing: Project[] = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) ?? "[]");
    const alreadyExists = existing.some((p) => p.quoteId === quote.id);
    if (alreadyExists) { onGoToProjects(); return; }
    const newProject: Project = {
      id:              `proj-${Date.now()}`,
      name:            quote.projectName,
      clientId:        quote.clientId,
      clientName:      quote.clientName,
      projectTypeId:   quote.projectTypeId,
      projectTypeName: quote.projectTypeName,
      price:           quote.finalPrice,
      deadline:        "",
      status:          "in_progress",
      notes:           "",
      quoteId:         quote.id,
      createdAt:       Date.now(),
    };
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([newProject, ...existing]));
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

    // Mark as sent
    setQuotes((prev) =>
      prev.map((q) => (q.id === quote.id ? { ...q, status: "sent" } : q)),
    );

    // Auto-create active project if it doesn't exist yet
    const existing: Project[] = JSON.parse(localStorage.getItem(PROJECTS_STORAGE_KEY) ?? "[]");
    if (!existing.some((p) => p.quoteId === quote.id)) {
      const newProject: Project = {
        id:              `proj-${Date.now()}`,
        name:            quote.projectName,
        clientId:        quote.clientId,
        clientName:      quote.clientName,
        projectTypeId:   quote.projectTypeId,
        projectTypeName: quote.projectTypeName,
        price:           quote.finalPrice,
        deadline:        "",
        status:          "in_progress",
        notes:           quote.notes,
        quoteId:         quote.id,
        createdAt:       Date.now(),
      };
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify([newProject, ...existing]));
    }
  };

  const formatDate = (ts: number) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(ts));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-2">
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
          <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
            Quote Generator
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-white">
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
          <h2 className="text-base font-semibold text-white">New quote</h2>

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
              className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
            />
          </label>

          {/* Project type */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Project type *</span>
            <div className="relative">
              <select
                value={form.projectTypeId}
                onChange={(e) => handleProjectTypeChange(e.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-white/15 bg-black/30 px-3 pr-8 text-sm text-white outline-none focus:border-accent"
              >
                {projectTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            </div>
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

          {/* Final price */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">Your price (COP) *</span>
            <input
              type="number"
              min="0"
              step="50000"
              placeholder="0"
              value={form.finalPrice}
              onChange={(e) =>
                setForm((p) => ({ ...p, finalPrice: e.target.value }))
              }
              className={`h-10 rounded-xl border bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent ${
                isBelowMin
                  ? "border-red-400/50 focus:border-red-400"
                  : "border-white/15"
              }`}
            />
            {isBelowMin && (
              <p className="text-xs text-red-400">
                ⚠ Below your minimum rate ({formatCOP(minPrice)})
              </p>
            )}
          </label>

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
              <div className="relative">
                <select
                  value={form.clientId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, clientId: e.target.value }))
                  }
                  className="h-10 w-full appearance-none rounded-xl border border-white/15 bg-black/30 px-3 pr-8 text-sm text-white outline-none focus:border-accent"
                >
                  <option value="">Select a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}{c.company ? ` — ${c.company}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              </div>
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
              className="resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-accent"
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

      {/* No quotes yet */}
      {quotes.length === 0 && !showForm && pricing.isSetupComplete && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] py-16 text-center">
          <p className="text-sm text-zinc-500">No quotes yet.</p>
          <p className="mt-1 text-xs text-zinc-600">
            Create your first quote and send it to a client in seconds.
          </p>
        </div>
      )}

      {/* Quotes list */}
      {quotes.length > 0 && (
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
                        quote.status === "sent"
                          ? "bg-green-400/10 text-green-400"
                          : "bg-white/5 text-zinc-500"
                      }`}
                    >
                      {quote.status === "sent" ? "Sent" : "Draft"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    {quote.clientName} · {quote.projectTypeName}
                  </p>
                  <p className="text-xs text-zinc-500">{formatDate(quote.createdAt)}</p>
                </div>

                {/* Right: price + actions */}
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <p className="text-sm font-bold text-accent">
                    {formatCOP(quote.finalPrice)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSendEmail(quote)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      title="Send quote — automatically creates an active project"
                    >
                      <Send className="h-3 w-3" />
                      {quote.status === "sent" ? "Resend" : "Send"}
                    </button>
                    {quote.status !== "sent" && (
                      <button
                        onClick={() => handleConvertToProject(quote)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-400"
                        title="Manually move to active projects"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        Project
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(quote.id)}
                      className="rounded-lg border border-white/10 p-1.5 text-zinc-600 transition hover:border-red-400/30 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
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
