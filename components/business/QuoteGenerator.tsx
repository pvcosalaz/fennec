"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation, Trans } from "react-i18next";
import { useCloudValue } from "@/lib/useCloudValue";
import { getCurrency, formatMoney, useCurrency, currencyMeta } from "@/lib/currency";
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
  PAYMENT_METHODS,
  paymentMethodMeta,
  type PaymentMethod,
  type PaymentMethodId,
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
  getProjects,
} from "@/lib/businessDb";
import { supabase } from "@/lib/supabase";

type Props = {
  onBack: () => void;
  onGoToClients: () => void;
  onGoToCalculator: () => void;
  onGoToProjects: () => void;
  /** Arrive with the form already open, for entry points that say "New quote". */
  autoOpenForm?: boolean;
  userId: string;
};

const newItem = (): QuoteItem => ({ id: crypto.randomUUID(), concept: "", qty: 1, unitPrice: 0 });

/** Terms the producer reuses on every quote (payment details, revision policy). */
const NOTES_DEFAULT_KEY = "fennec-quote-notes-default-v1";
/** How the producer gets paid. Typed once, reused on every quote. */
const PAYMENT_DEFAULT_KEY = "fennec-payment-methods-default-v1";

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
  paymentMethods: [] as PaymentMethod[],
};

export default function QuoteGenerator({
  onBack,
  onGoToClients,
  onGoToCalculator,
  onGoToProjects,
  autoOpenForm = false,
  userId,
}: Props) {
  const { t } = useTranslation();
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
  /** Live so the breakdown's symbol follows a change in Settings. */
  const currencySymbol = currencyMeta(useCurrency()).symbol;
  /** "Where do these two numbers come from?" Collapsed by default. */
  const [showPriceInfo, setShowPriceInfo] = useState(false);

  /* Reusable notes: bank details and terms are the same on every quote, and
     retyping account details each time is how they go missing from the one that
     mattered. Kept in user_state so it follows the account across devices. */
  const [notesDefault, setNotesDefaultState] = useState("");
  const applyNotesDefault = (v: string) => {
    setNotesDefaultState(v);
    try { localStorage.setItem(NOTES_DEFAULT_KEY, v); } catch { /* ignore */ }
  };
  useEffect(() => {
    try { setNotesDefaultState(localStorage.getItem(NOTES_DEFAULT_KEY) ?? ""); } catch { /* ignore */ }
  }, []);
  useCloudValue(NOTES_DEFAULT_KEY, notesDefault, applyNotesDefault);
  const setNotesDefault = applyNotesDefault;

  /* Same idea for how you get paid: typed once, reused on every quote. */
  const [paymentDefault, setPaymentDefaultState] = useState<PaymentMethod[]>([]);
  const applyPaymentDefault = (v: PaymentMethod[]) => {
    setPaymentDefaultState(v);
    try { localStorage.setItem(PAYMENT_DEFAULT_KEY, JSON.stringify(v)); } catch { /* ignore */ }
  };
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PAYMENT_DEFAULT_KEY);
      if (raw) setPaymentDefaultState(JSON.parse(raw) as PaymentMethod[]);
    } catch { /* ignore */ }
  }, []);
  useCloudValue(PAYMENT_DEFAULT_KEY, paymentDefault, applyPaymentDefault);
  const setPaymentDefault = applyPaymentDefault;

  /** Compared on method+label+details: the row ids differ every time. */
  const paymentSignature = (list: PaymentMethod[]) =>
    JSON.stringify(list.map((m) => [m.method, m.label ?? "", m.details]));
  const samePaymentAsDefault =
    paymentSignature(form.paymentMethods) === paymentSignature(paymentDefault);

  const updatePaymentMethod = (id: string, patch: Partial<PaymentMethod>) =>
    setForm((p) => ({
      ...p,
      paymentMethods: p.paymentMethods.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  const [saved, setSaved] = useState(false);
  /** Set when an edit also updated the project this quote became. */
  const [projectSync, setProjectSync] = useState<{ added: number } | null>(null);
  const [pricing, setPricing] = useState<ReturnType<typeof computePricing>>({
    minPricePerProject: 0, monthlyTarget: 0,
    maxProjects: 0, hoursPerProject: 0, isSetupComplete: false,
  });

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

  /* The minimum is a floor by definition: below it the project doesn't cover
     your own costs. Multipliers under 1 (student short film is 0.5) used to
     drag the RECOMMENDED price beneath it, so the app suggested a number and
     then warned you that same number was too low — it argued with itself
     (Paco 2026-08-01). Recommending a loss is never right; if the producer
     wants to subsidise a student film that's their call to make by typing it. */
  const rawRecommended = minPrice * activeProjectType.multiplier;
  const recommendedPrice = Math.max(minPrice, rawRecommended);
  const recommendedIsFloored = minPrice > 0 && rawRecommended < minPrice;

  // When project type changes, update the final price suggestion
  const handleProjectTypeChange = (id: string) => {
    const pt = projectTypes.find((p) => p.id === id) ?? projectTypes[0];
    const newRecommended = Math.round(Math.max(minPrice, minPrice * pt.multiplier));
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
      // Start from the saved terms and payment methods so they're never the
      // thing you forgot. Editable per quote; editing doesn't touch the default.
      notes: notesDefault,
      paymentMethods: paymentDefault.map((m) => ({ ...m, id: crypto.randomUUID() })),
    });
    setShowForm(true);
  };

  /* Arriving from a "New quote" button opens the form itself. Deliberately
     waits for the pricing setup to resolve: openForm seeds the price from the
     recommended rate, and firing on mount would open a form priced at zero.
     If the setup is incomplete the gate shows instead, which is correct. */
  const autoOpened = useRef(false);
  useEffect(() => {
    if (!autoOpenForm || autoOpened.current) return;
    if (!pricing.isSetupComplete) return;
    autoOpened.current = true;
    openForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenForm, pricing.isSetupComplete]);

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
      // Quotes written before payment methods existed open with none rather
      // than inheriting today's default, which would rewrite their history.
      paymentMethods: (quote.paymentMethods ?? []).map((m) => ({ ...m })),
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
      // Blank rows would print an empty line on the client's PDF.
      paymentMethods: form.paymentMethods.filter((m) => m.details.trim()),
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

    // A quote the client already approved has a project living downstream of
    // it. Editing the quote used to leave that project on the old price and
    // the old deliverables, silently (Paco 2026-08-01).
    if (existing?.status === "approved" && existing.projectId) {
      void syncApprovedProject(newQuote, existing.projectId);
    }
  };

  /**
   * Push an edited quote's changes onto the project it became.
   *
   * Additive on purpose. Price and currency follow the quote, but deliverables
   * are only ADDED: overwriting would wipe the boxes the producer already
   * ticked and any concept they added by hand on the project side. Removing a
   * line from a quote is not the same as saying the work never happened.
   */
  const syncApprovedProject = async (quote: Quote, projectId: string) => {
    const project = (await getProjects(userId)).find((p) => p.id === projectId);
    if (!project) return;  // deleted — the quote card offers "Rebuild project"

    const have = new Set(
      (project.deliverables ?? []).map((d) => d.concept.trim().toLowerCase()),
    );
    const added = deliverablesFromQuote(quote).filter(
      (d) => d.concept.trim() && !have.has(d.concept.trim().toLowerCase()),
    );

    await upsertProject(userId, {
      ...project,
      price: quote.finalPrice,
      currency: quote.currency,
      deliverables: [...(project.deliverables ?? []), ...added],
    });
    setProjectSync({ added: added.length });
    setTimeout(() => setProjectSync(null), 5000);
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
        {t("clVolverBusiness")}
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-accent uppercase">
            {t("qgTitulo")}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {t("qgCrearCotizacion")}
          </h1>
          <p className="text-sm text-zinc-400">
            {t("qgSubtitulo")}
          </p>
        </div>
        {pricing.isSetupComplete && !showForm && (
          <button
            onClick={openForm}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <FilePlus className="h-4 w-4" />
            {t("qgNuevaCotizacion")}
          </button>
        )}
      </div>

      {/* Warning: pricing not set up */}
      {!pricing.isSetupComplete && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-medium text-white">
              {t("qgConfiguraPrimero")}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {t("qgConfiguraPrimeroSub")}
            </p>
            <button
              onClick={onGoToCalculator}
              className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-black transition hover:brightness-110"
            >
              {t("qgAbrirCalculadora")}
            </button>
          </div>
        </div>
      )}

      {/* Saved toast */}
      {saved && (
        <div className="flex items-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent">
          <CheckCircle2 className="h-4 w-4" />
          {t("qgCotizacionGuardada")}
        </div>
      )}

      {/* Say it out loud when an edit reached downstream. A silent write to a
          project the producer isn't looking at is how trust in the numbers
          goes away. */}
      {projectSync && (
        <button
          onClick={onGoToProjects}
          className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-left text-sm text-zinc-300 transition hover:border-accent/40 hover:text-accent"
        >
          <ArrowRight className="h-4 w-4 flex-shrink-0" />
          <span>
            {t("qgProyectoActualizado")}
            {projectSync.added > 0 ? ` · ${t("qgEntregablesNuevos", { count: projectSync.added })}` : ""}
          </span>
        </button>
      )}

      {/* New quote form */}
      {showForm && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-white">{editingId ? "Edit quote" : "New quote"}</h2>

          {/* Project name */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">{t("apNombreProyecto")}</span>
            <input
              type="text"
              placeholder={t("qgEjNombreProyecto")}
              value={form.projectName}
              onChange={(e) =>
                setForm((p) => ({ ...p, projectName: e.target.value }))
              }
              className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
          </label>

          {/* Project type */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">{t("qgTipoProyecto")}</span>
            <Select
              value={form.projectTypeId}
              onChange={handleProjectTypeChange}
              options={projectTypes.map((pt) => ({ value: pt.id, label: pt.label }))}
            />
          </label>

          {/* Pricing info */}
          {pricing.isSetupComplete && (
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-zinc-500">{t("qgPrecioMinimo")}</p>
                  {/* Inline disclosure, not a floating tooltip: this card sits
                      inside a scrolling form, and absolutely-positioned popovers
                      have already been clipped twice in this app. */}
                  <button
                    type="button"
                    onClick={() => setShowPriceInfo((v) => !v)}
                    aria-expanded={showPriceInfo}
                    aria-label={t("qgComoSeCalcula")}
                    className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-bold transition ${
                      showPriceInfo
                        ? "border-accent/60 text-accent"
                        : "border-white/20 text-zinc-500 hover:border-accent/60 hover:text-accent"
                    }`}
                  >
                    i
                  </button>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-zinc-300">
                  {formatCOP(minPrice)}
                </p>
              </div>
              <div>
                <p className="text-xs text-zinc-500">{t("qgRecomendado")}</p>
                <p className="mt-0.5 text-sm font-semibold text-accent">
                  {formatCOP(recommendedPrice)}
                </p>
                {recommendedIsFloored && (
                  <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                    This project type usually pays less, but your minimum is the
                    floor.
                  </p>
                )}
              </div>
              </div>

              {/* Where the two numbers come from, in the producer's own
                  figures. A generic formula wouldn't be checkable; these are
                  the values they typed into the calculator. */}
              {showPriceInfo && (
                <div className="mt-3 space-y-2.5 border-t border-white/10 pt-3 text-[11px] leading-relaxed text-zinc-400">
                  {/* Trans, no concatenacion: la negrita cae sobre valores
                      dinamicos y el orden de la frase no es el mismo en los dos
                      idiomas. Partirla en trozos daria un español roto. */}
                  <p>
                    <Trans
                      i18nKey="qgExplicaMinimo"
                      count={pricing.maxProjects}
                      values={{
                        objetivo: formatCOP(pricing.monthlyTarget),
                        proyectos: pricing.maxProjects,
                        horas: pricing.hoursPerProject,
                      }}
                      components={{ b: <b className="font-semibold text-zinc-300" /> }}
                    />
                  </p>
                  <p>
                    <Trans
                      i18nKey={recommendedIsFloored ? "qgExplicaRecomendadoTope" : "qgExplicaRecomendado"}
                      values={{ tipo: activeProjectType.label, mult: activeProjectType.multiplier }}
                      components={{ b: <b className="font-semibold text-zinc-300" /> }}
                    />
                  </p>
                  <p className="text-zinc-500">
                    {t("qgAmbosVienenDe")}
                  </p>
                  <button
                    type="button"
                    onClick={onGoToCalculator}
                    className="text-[11px] font-semibold text-accent transition hover:brightness-110"
                  >
                    {t("qgAbrirCalculadora")} →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Breakdown — a producer quotes a bundle (main track + variation +
              rush), so the client needs the concepts, not one lump number.
              The total is computed from these lines. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">{t("qgDesglose")}</span>
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
                  {/* Same ambiguity as the price: a lone "1" doesn't say it's
                      a count. "×1" is unmistakable at a glance. */}
                  <div className="relative h-10 w-16 flex-shrink-0">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-600"
                    >
                      ×
                    </span>
                    <input
                      type="number" min="1" step="1" aria-label={t("qgCantidad")}
                      value={it.qty}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        items: p.items.map((x) => x.id === it.id ? { ...x, qty: Number(e.target.value) || 1 } : x),
                      }))}
                      className="h-10 w-full rounded-xl border border-white/15 bg-black/30 pl-6 pr-2 text-center text-sm text-white outline-none focus:border-accent"
                    />
                  </div>
                  {/* A bare "0" doesn't say whether it's money, minutes or
                      units (Paco 2026-08-01). The symbol is the user's actual
                      currency, not a hardcoded "$" — a Brazilian sees R$. */}
                  <div className="relative h-10 w-28 flex-shrink-0">
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm transition-colors ${
                        it.unitPrice ? "text-zinc-400" : "text-zinc-600"
                      }`}
                    >
                      {currencySymbol}
                    </span>
                    <input
                      type="number" min="0" step="1000" placeholder="0" aria-label={t("qgPrecioUnitario")}
                      value={it.unitPrice || ""}
                      onChange={(e) => setForm((p) => ({
                        ...p,
                        items: p.items.map((x) => x.id === it.id ? { ...x, unitPrice: Number(e.target.value) || 0 } : x),
                      }))}
                      className="h-10 w-full rounded-xl border border-white/15 bg-black/30 pl-8 pr-3 text-right text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label={t("qgQuitarConcepto")}
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
              <span className="text-xs text-zinc-400">{t("qgEtiquetaImpuesto")}</span>
              <input
                type="text" placeholder={t("qgIvaOpcional")}
                value={form.taxLabel}
                onChange={(e) => setForm((p) => ({ ...p, taxLabel: e.target.value }))}
                className="h-10 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
              />
            </label>
            <label className="flex w-24 flex-col gap-1.5">
              <span className="text-xs text-zinc-400">{t("qgTasa")}</span>
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
              <span className="text-zinc-500">{t("qgSubtotal")}</span>
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

          {/* ── Payment options ──
              Its own block, not a line buried in the notes: this is the part
              of the quote that decides whether you actually get paid, and the
              PDF renders it as a "How to pay" section (Paco 2026-08-01). */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">{t("qgOpcionesPago")}</span>

            {form.paymentMethods.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {form.paymentMethods.map((pm) => {
                  const meta = paymentMethodMeta(pm.method);
                  return (
                    <div key={pm.id} className="flex items-center gap-1.5">
                      <span className="w-28 flex-shrink-0 truncate text-xs font-medium text-zinc-300">
                        {meta.label}
                      </span>
                      {pm.method === "other" && (
                        <input
                          type="text"
                          aria-label={t("qgNombreMetodo")}
                          placeholder={t("qgNombralo")}
                          value={pm.label ?? ""}
                          onChange={(e) => updatePaymentMethod(pm.id, { label: e.target.value })}
                          className="h-10 w-28 flex-shrink-0 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
                        />
                      )}
                      <input
                        type="text"
                        aria-label={`${meta.label} details`}
                        placeholder={meta.placeholder}
                        value={pm.details}
                        onChange={(e) => updatePaymentMethod(pm.id, { details: e.target.value })}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-white/15 bg-black/30 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${meta.label}`}
                        onClick={() => setForm((p) => ({
                          ...p,
                          paymentMethods: p.paymentMethods.filter((x) => x.id !== pm.id),
                        }))}
                        className="flex h-10 w-8 flex-shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:text-white"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add-a-method picker. Resets to its placeholder after each pick so
                it reads as an action, not as a field holding a value. */}
            <div className="flex items-center gap-2">
              {/* The app's own Select, not a native one: an OS list arrives
                  with system colours and its own frame and reads as a foreign
                  object inside the card (Paco 2026-08-01). */}
              <Select
                value=""
                aria-label={t("qgAgregarMetodo")}
                triggerLabel="+ Add payment method"
                compact
                options={PAYMENT_METHODS.map((m) => ({ value: m.id, label: m.label }))}
                onChange={(v) => {
                  if (!v) return;
                  setForm((p) => ({
                    ...p,
                    paymentMethods: [
                      ...p.paymentMethods,
                      { id: crypto.randomUUID(), method: v as PaymentMethodId, details: "" },
                    ],
                  }));
                }}
              />

              {form.paymentMethods.length > 0 && !samePaymentAsDefault && (
                <button
                  type="button"
                  onClick={() => setPaymentDefault(form.paymentMethods)}
                  className="text-[11px] font-semibold text-accent transition hover:brightness-110"
                >
                  {t("qgGuardarPorDefecto")}
                </button>
              )}
              {form.paymentMethods.length > 0 && samePaymentAsDefault && (
                <span className="text-[11px] font-medium text-emerald-400/80">
                  {t("qgGuardadoPorDefecto")}
                </span>
              )}
            </div>

            {form.paymentMethods.length === 0 && (
              <p className="text-[11px] text-zinc-600">
                {t("qgAddPaymentMethod")}
              </p>
            )}
          </div>

          {/* Client */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">{t("qgClienteReq")}</span>
            {clients.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-4">
                <p className="text-xs text-zinc-500">{t("qgNoClientsSaved")}</p>
                <button
                  onClick={onGoToClients}
                  className="mt-2 text-xs text-accent underline-offset-2 hover:underline"
                >
                  {t("qgAddClientFirst")}
                </button>
              </div>
            ) : (
              <Select
                value={form.clientId}
                onChange={(val) => setForm((p) => ({ ...p, clientId: val }))}
                placeholder={t("qgSeleccionaCliente")}
                options={clients.map((c) => ({ value: c.id, label: c.name + (c.company ? ` — ${c.company}` : "") }))}
              />
            )}
          </div>

          {/* Notes */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-zinc-400">{t("qgNotasTerminos")}</span>
            <textarea
              placeholder={"Deposit, deadlines, revisions included, usage rights…"}
              value={form.notes}
              onChange={(e) =>
                setForm((p) => ({ ...p, notes: e.target.value }))
              }
              rows={4}
              className="resize-none rounded-xl border border-white/15 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-accent"
            />
            {/* This block ends up on the client's PDF under "Notes & terms",
                which makes it the natural home for bank details. Nobody wants
                to retype account details on every quote, so it can be saved as the
                starting point for the next one (Paco 2026-08-01). */}
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <span className="text-[11px] text-zinc-500">
                Appears on the client&rsquo;s PDF.
              </span>
              {form.notes.trim() && form.notes !== notesDefault && (
                <button
                  type="button"
                  onClick={() => setNotesDefault(form.notes)}
                  className="text-[11px] font-semibold text-accent transition hover:brightness-110"
                >
                  {t("qgGuardarPorDefectoFuturas")}
                </button>
              )}
              {form.notes.trim() !== "" && form.notes === notesDefault && (
                <span className="text-[11px] font-medium text-emerald-400/80">
                  Saved as your default
                </span>
              )}
              {!form.notes.trim() && notesDefault.trim() && (
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, notes: notesDefault }))}
                  className="text-[11px] font-semibold text-accent transition hover:brightness-110"
                >
                  {t("qgInsertarTerminos")}
                </button>
              )}
            </div>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              onClick={cancelForm}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-zinc-300 transition hover:text-white"
            >
              {t("mtCancel")}
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("qgGuardarCotizacion")}
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
          <p className="text-sm text-zinc-500">{t("qgNoQuotesYet")}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {t("qgNoQuotesBody")}
          </p>
        </div>
      )}

      {/* Quotes list */}
      {!loading && quotes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t("qgCotizacionesGuardadas")}
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
                      title={t("qgAbrirPdf")}
                    >
                      <FileText className="h-3 w-3" />
                      PDF
                    </button>
                    <button
                      onClick={() => startEdit(quote)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      title={t("qgEditarCotizacion")}
                    >
                      <Pencil className="h-3 w-3" />
                      {t("qgEditar")}
                    </button>
                    <button
                      onClick={() => handleSendEmail(quote)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      title={t("qgEnviarCorreo")}
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
                    title={t("qgEnviadaOtroMedio")}
                  >
                    <Send className="h-3 w-3" />
                    {t("qgMarcarEnviada")}
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
                        <span className="text-[11px] text-zinc-400">{t("qgArrancarProyecto")}</span>
                        <button
                          onClick={() => { setConfirmApproveId(null); handleApprove(quote); }}
                          className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-400 transition hover:bg-emerald-500/30"
                        >
                          {t("qgSiAprobada")}
                        </button>
                        <button
                          onClick={() => setConfirmApproveId(null)}
                          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-semibold text-zinc-400 transition hover:border-white/20"
                        >
                          {t("mtCancel")}
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmApproveId(quote.id)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-400"
                        title={t("qgClienteAcepto")}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {t("qgMarcarAprobada")}
                      </button>
                    )}
                    <button
                      onClick={() => setQuoteStatus(quote, "declined")}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-500 transition hover:border-red-400/40 hover:text-red-400"
                      title={t("qgClienteRechazo")}
                    >
                      <XCircle className="h-3 w-3" />
                      {t("qgRechazada")}
                    </button>
                  </>
                )}

                {quote.status === "approved" && (
                  <>
                    <span className="text-xs text-emerald-400/80">
                      Approved{quote.approvedAt ? ` · ${formatDate(quote.approvedAt)}` : ""}
                    </span>
                    {quote.projectId ? (
                      <button
                        onClick={onGoToProjects}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-accent/50 hover:text-accent"
                      >
                        <ArrowRight className="h-3 w-3" />
                        {t("qgVerProyecto")}
                      </button>
                    ) : (
                      /* Its project was deleted. The client still approved, so
                         the quote keeps that status and offers to rebuild. */
                      <button
                        onClick={() => handleApprove(quote)}
                        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-emerald-400/50 hover:text-emerald-400"
                        title={t("qgProyectoBorrado")}
                      >
                        <RotateCcw className="h-3 w-3" />
                        {t("qgRecrearProyecto")}
                      </button>
                    )}
                  </>
                )}

                {quote.status === "declined" && (
                  <button
                    onClick={() => setQuoteStatus(quote, "sent")}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-400 transition hover:border-accent/50 hover:text-accent"
                    title={t("qgVolvieron")}
                  >
                    <RotateCcw className="h-3 w-3" />
                    {t("qgReabrir")}
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
