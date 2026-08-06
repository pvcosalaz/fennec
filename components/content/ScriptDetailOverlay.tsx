"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, Trash2, Pencil, Check, MonitorPlay } from "lucide-react";
import type { Brief } from "@/lib/contentData";
import Teleprompter from "./Teleprompter";
import ToolPage from "./ToolPage";

type ContentTask = { id: string; title: string; date: string; source: string };

type Props = {
  brief: Brief;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSchedule: (title: string, notes?: string) => void;
  onUpdate: (id: string, title: string, script: string, newDate?: string) => void;
  scheduledTask: ContentTask | null;
  isDesktop?: boolean;
};

export default function ScriptDetailOverlay({ brief, onClose, onDelete, onSchedule, onUpdate, scheduledTask, isDesktop = false }: Props) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [title,   setTitle]   = useState(brief.title);
  const [script,  setScript]  = useState(brief.script ?? "");
  const [date,    setDate]    = useState(scheduledTask?.date ?? "");
  const [saved,   setSaved]   = useState(false);
  const [teleprompter, setTeleprompter] = useState(false);

  function handleSave() {
    if (!title.trim()) return;
    onUpdate(brief.id, title.trim(), script.trim(), date || undefined);
    setSaved(true);
    setTimeout(() => { setSaved(false); setEditing(false); }, 800);
  }

  return (
    <ToolPage
      isDesktop={isDesktop}
      eyebrow={editing ? t("sdEditingScript") : t("sdScript")}
      onBack={editing
        ? () => { setEditing(false); setTitle(brief.title); setScript(brief.script ?? ""); }
        : onClose}
      actions={editing ? (
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-black transition disabled:opacity-30"
        >
          {saved ? <Check size={14} /> : null}
          {saved ? t("sdSaved") : t("sdSave")}
        </button>
      ) : (
        <>
          <button
            onClick={() => setEditing(true)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400 transition hover:text-white"
            aria-label={t("sdEditAria")}
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => { onDelete(brief.id); onClose(); }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-600 transition hover:text-red-400"
            aria-label={t("sdDeleteAria")}
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
      footer={!editing ? (
        <>
          {script.trim() && (
            <button
              onClick={() => setTeleprompter(true)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 font-bold text-white transition hover:bg-white/10 active:scale-[0.98]"
            >
              <MonitorPlay size={16} />
              {t("sdReadTeleprompter")}
            </button>
          )}
          <button
            onClick={() => onSchedule(title, script || undefined)}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-accent font-bold text-black transition hover:brightness-105 active:scale-[0.98]"
          >
            <Calendar size={16} />
            {t("sdScheduleContent")}
          </button>
        </>
      ) : undefined}
    >
      <>
        {/* Format + Line tags */}
        <div className="flex flex-wrap items-center gap-2">
          {brief.formatName && (
            <span
              className="rounded-full px-3 py-1 text-xs font-semibold text-black"
              style={{ backgroundColor: brief.formatColor || "#f5a623" }}
            >
              {brief.formatName}
            </span>
          )}
          {brief.lineName && (
            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-400">
              {brief.lineName}
            </span>
          )}
          {/* The reference link the script came from (a Quick Idea's URL,
              an Inspire video) — it used to be lost on save */}
          {brief.refUrl && (
            <a
              href={brief.refUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-[220px] truncate rounded-full border border-accent/30 px-3 py-1 text-xs text-accent transition hover:border-accent/60"
            >
              {t("sdReference")}
            </a>
          )}
        </div>

        {editing ? (
          <>
            {/* Title input */}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("sdTitlePlaceholder")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold placeholder-zinc-600 focus:outline-none focus:border-accent/50"
            />

            {/* Date picker */}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
              <Calendar size={15} className="text-zinc-500 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">{t("sdPublishDate")}</p>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none w-full"
                />
              </div>
              {date && (
                <button onClick={() => setDate("")} className="text-zinc-600 hover:text-red-400 text-xs transition">✕</button>
              )}
            </div>

            {/* Script textarea */}
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder={t("sdScriptPlaceholder")}
              rows={14}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-zinc-200 placeholder-zinc-600 leading-relaxed resize-none focus:outline-none focus:border-accent/50"
              style={{ fontFamily: "Courier, 'Courier New', monospace", fontSize: "12px" }}
            />
          </>
        ) : (
          <>
            {/* Title */}
            <h1 className="text-2xl font-bold text-white leading-snug">{title}</h1>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/5" />
              <p className="text-[10px] text-zinc-600 uppercase tracking-widest">{t("sdScript")}</p>
              <div className="flex-1 h-px bg-white/5" />
            </div>

            {/* Script body */}
            {script ? (
              <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">{script}</p>
            ) : (
              <p className="text-sm text-zinc-600 italic">{t("sdNoScript")}</p>
            )}
          </>
        )}

        {teleprompter && (
          <Teleprompter text={script} title={title} onClose={() => setTeleprompter(false)} />
        )}
      </>
    </ToolPage>
  );
}
