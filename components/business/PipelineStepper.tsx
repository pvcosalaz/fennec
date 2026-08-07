"use client";
import { useTranslation } from "react-i18next";

/* ═══════════════════════════════════════════════════════════════
   PIPELINE STEPPER

   The seven stages are ONE pipeline even though they live on two
   objects and two screens:

     Draft → Sent → Approved │ In Progress → In Review → Delivered → Paid
     └──────── quote ────────┘└──────────── project ────────────────┘

   Before this you could only see the next available action, never
   the map — "no sé en qué fase va" (Paco 2026-08-01). Now the whole
   run is visible from either screen: a quote shows the project
   stages ahead of it dimmed, a project shows the quote stages
   behind it already filled.

   Seeing and moving are deliberately different permissions. You can
   step forward one at a time and jump backwards freely, but you
   cannot leap ahead: skipping to Paid without logging a payment
   would make the money numbers lie, and un-approving across the
   quote/project boundary would orphan the project. The caller
   decides what's selectable via canSelect.
   ═══════════════════════════════════════════════════════════════ */

export type PipelineKey =
  | "draft" | "sent" | "approved"
  | "in_progress" | "review" | "delivered" | "paid";

/* `label` es una LLAVE de i18n, no el texto: se resuelve con t() al pintar. */
export const PIPELINE: { key: PipelineKey; label: string; owner: "quote" | "project" }[] = [
  { key: "draft",       label: "plBorrador",  owner: "quote"   },
  { key: "sent",        label: "plEnviada",   owner: "quote"   },
  { key: "approved",    label: "plAprobada",  owner: "quote"   },
  { key: "in_progress", label: "apEstEnCurso",   owner: "project" },
  { key: "review",      label: "apEstRevision",  owner: "project" },
  { key: "delivered",   label: "apEstEntregado", owner: "project" },
  { key: "paid",        label: "apEstPagado",    owner: "project" },
];

export const pipelineIndex = (key: PipelineKey) =>
  PIPELINE.findIndex((s) => s.key === key);

export function PipelineStepper({
  current,
  canSelect,
  onSelect,
}: {
  current: PipelineKey;
  /** Which stages this screen is allowed to move to. */
  canSelect: (key: PipelineKey) => boolean;
  onSelect: (key: PipelineKey) => void;
}) {
  const { t } = useTranslation();
  const currentIdx = pipelineIndex(current);
  const currentStep = PIPELINE[currentIdx];

  return (
    <div className="space-y-2">
      {/* Segments. Seven of them fit on a phone as bars; the labels are what
          don't, so those drop to a single line below on narrow screens. */}
      <div className="-my-2 flex items-center gap-1">
        {PIPELINE.map((step, i) => {
          const done      = i < currentIdx;
          const isCurrent = i === currentIdx;
          const selectable = canSelect(step.key);

          const tone = isCurrent
            ? "bg-accent"
            : done
              ? "bg-accent/40"
              : "bg-white/10";

          return (
            /* The visible bar is 6px tall, which is far too small to hit. The
               button is padded to ~22px and transparent, so the target is
               finger-sized while the bar stays thin. */
            <button
              key={step.key}
              type="button"
              disabled={!selectable}
              onClick={() => selectable && onSelect(step.key)}
              aria-label={
                isCurrent ? t("plEtapaActual", { etapa: t(step.label) }) : t("plMoverA", { etapa: t(step.label) })
              }
              aria-current={isCurrent ? "step" : undefined}
              title={selectable ? t("plMoverA", { etapa: t(step.label) }) : t(step.label)}
              className={`group flex flex-1 items-center py-2 ${
                selectable ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <span
                className={`h-1.5 w-full rounded-full transition ${tone} ${
                  selectable ? "group-hover:brightness-150 group-active:brightness-125" : ""
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Labels — full row on desktop, current-only on phones */}
      {/* pt-2 restores the gap the row's -my-2 swallowed */}
      <div className="hidden gap-1 pt-2 sm:grid" style={{ gridTemplateColumns: `repeat(${PIPELINE.length}, minmax(0,1fr))` }}>
        {PIPELINE.map((step, i) => (
          <span
            key={step.key}
            className={`truncate text-center text-[9.5px] font-medium leading-tight transition ${
              i === currentIdx
                ? "text-accent"
                : i < currentIdx
                  ? "text-zinc-500"
                  : "text-zinc-700"
            }`}
          >
            {t(step.label)}
          </span>
        ))}
      </div>
      <p className="pt-2 text-[10px] font-medium text-zinc-500 sm:hidden">
        {t("plEtapaDe", { n: currentIdx + 1, total: PIPELINE.length })} ·{" "}
        <span className="text-accent">{t(currentStep.label)}</span>
      </p>
    </div>
  );
}
