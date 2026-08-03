"use client";

import { useState } from "react";
import { Plus, Trash2, X, ArrowRight, Loader2, Check, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RiseStyle, Band, SURFACE, ACCENT } from "@/components/desktop/ui";
import {
  CONTENT_LINES_KEY, CONTENT_FORMATS_KEY,
  DEFAULT_LINES, DEFAULT_FORMATS,
  type ContentLine, type ContentFormat,
} from "@/lib/contentData";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

type VideoRef = {
  title: string;
  channel: string;
  angle: string;
  why: string;
  url: string;
  thumbnail: string;
};

type Props = {
  onClose: () => void;
  onGenerateScript: (ref: VideoRef) => void;
  isDesktop?: boolean;
};

type View = "matrix" | "add-format" | "add-line";

/* ── Piezas del banco de trabajo de desktop ─────────────────────────────────── */

/** Un lado de la receta. Vacío se lee como hueco por llenar, no como error. */
function Slot({ label, value, color, onClear }: {
  label: string; value: string | null; color?: string; onClear: () => void;
}) {
  if (!value) {
    return (
      <span className="rounded-lg border border-dashed border-white/12 px-3 py-1.5 text-[12px] text-zinc-500">
        {label}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 rounded-lg border border-accent/35 bg-accent/10 py-1.5 pl-3 pr-2 text-[12px] font-medium text-white">
      {color && <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: color }} />}
      {value}
      <button onClick={onClear} className="text-zinc-500 transition hover:text-white" aria-label={`Clear ${label}`}>
        <X size={12} />
      </button>
    </span>
  );
}

/** Fila de cualquiera de los dos ejes. Hairlines en vez de tarjetas anidadas;
 *  la barra de acento a la izquierda marca la selección sin repintar la fila. */
function Row({ first, selected, onSelect, onDelete, dot, title, description }: {
  first: boolean; selected: boolean; onSelect: () => void; onDelete?: () => void;
  dot?: string; title: string; description?: string;
}) {
  return (
    <div
      className={`group relative flex items-start gap-3 px-3.5 py-3 transition ${
        first ? "" : "border-t border-white/[0.05]"
      } ${selected ? "bg-white/[0.045]" : "hover:bg-white/[0.02]"}`}
    >
      {selected && <span className="absolute inset-y-0 left-0 w-[2px]" style={{ backgroundColor: ACCENT }} />}

      <button onClick={onSelect} className="flex min-w-0 flex-1 items-start gap-2.5 text-left">
        {dot && <span className="mt-[5px] h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: dot }} />}
        <span className="min-w-0">
          <span className={`block text-[13px] leading-snug ${selected ? "font-semibold text-white" : "text-zinc-300"}`}>
            {title}
          </span>
          {description && (
            <span className="mt-1 block text-[11.5px] leading-relaxed text-zinc-400">{description}</span>
          )}
        </span>
      </button>

      <span className="flex flex-shrink-0 items-center gap-2 pt-0.5">
        {selected && <Check size={13} style={{ color: ACCENT }} />}
        {onDelete && (
          <button
            onClick={onDelete}
            className="text-zinc-600 opacity-0 transition hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
            aria-label={`Delete ${title}`}
          >
            <Trash2 size={12} />
          </button>
        )}
      </span>
    </div>
  );
}

export default function MusicContentLab({ onClose, onGenerateScript, isDesktop = false }: Props) {
  const [formats, setFormats] = useState<ContentFormat[]>(() =>
    loadFromStorage(CONTENT_FORMATS_KEY, DEFAULT_FORMATS)
  );
  const [lines, setLines] = useState<ContentLine[]>(() =>
    loadFromStorage(CONTENT_LINES_KEY, DEFAULT_LINES)
  );

  const [selectedFormat, setSelectedFormat] = useState<ContentFormat | null>(null);
  const [selectedLine, setSelectedLine]     = useState<ContentLine   | null>(null);
  const [view, setView]       = useState<View>("matrix");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError]     = useState<string | null>(null);
  /* Haber llegado al tope del día no es un fallo: es que ya trabajaste mucho.
     Se guarda aparte para poder decirlo en tono ámbar y no en rojo de error. */
  const [genQuota, setGenQuota]     = useState<string | null>(null);

  async function handleGenerate() {
    if (!selectedFormat || !selectedLine) return;
    setGenerating(true);
    setGenError(null);
    setGenQuota(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/lab-idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          format: selectedFormat.name,
          line: selectedLine.name,
          // Los formatos de fábrica traen su definición; mandarla es la
          // diferencia entre un ángulo genérico y uno que sí entiende el
          // formato que eligió.
          formatDescription: selectedFormat.description ?? "",
        }),
      });
      const data = await res.json() as {
        angle?: string; why?: string; error?: string; quota?: boolean;
      };
      if (data.quota) { setGenQuota(data.error ?? "You're done for today."); return; }
      if (data.error || !data.angle) throw new Error(data.error ?? "No response");
      onGenerateScript({
        title: `${selectedFormat.name} — ${selectedLine.name}`,
        channel: selectedFormat.name,
        angle: data.angle,
        why: data.why ?? "",
        url: "",
        thumbnail: "",
      });
    } catch (e) {
      // El mensaje real, no un "try again" que no dice nada: la ruta manda
      // cosas accionables ("Content Lab is a Pro feature.") y tragárselas ya
      // costó una sesión de diagnóstico a ciegas antes.
      setGenError(e instanceof Error && e.message ? e.message : "Couldn't generate idea. Try again.");
    } finally {
      setGenerating(false);
    }
  }

  // Add form state
  const [newName, setNewName] = useState("");

  function addFormat() {
    const name = newName.trim();
    if (!name) return;
    const color = `hsl(${Math.floor(Math.random() * 360)}, 65%, 55%)`;
    const updated = [...formats, { id: uid(), name, color }];
    setFormats(updated);
    saveToStorage(CONTENT_FORMATS_KEY, updated);
    setNewName("");
    setView("matrix");
  }

  function addLine() {
    const name = newName.trim();
    if (!name) return;
    const updated = [...lines, { id: uid(), name }];
    setLines(updated);
    saveToStorage(CONTENT_LINES_KEY, updated);
    setNewName("");
    setView("matrix");
  }

  function deleteFormat(id: string) {
    const updated = formats.filter((f) => f.id !== id);
    setFormats(updated);
    saveToStorage(CONTENT_FORMATS_KEY, updated);
    if (selectedFormat?.id === id) setSelectedFormat(null);
  }

  function deleteLine(id: string) {
    const updated = lines.filter((l) => l.id !== id);
    setLines(updated);
    saveToStorage(CONTENT_LINES_KEY, updated);
    if (selectedLine?.id === id) setSelectedLine(null);
  }

  const combination = selectedFormat && selectedLine
    ? `${selectedFormat.name} — ${selectedLine.name}`
    : null;

  /* ═══════════════════════════════════════════════════════════════
     DESKTOP — el Lab como banco de trabajo, no como pantalla de teléfono.

     Lo que había era la versión móvil estirada: una losa `bg-zinc-950`
     encima del canvas con gradiente del shell (el "cuadro negro" que
     rompía la identidad, Paco 2026-08-02), dos medias columnas de
     botones diminutos y las descripciones de cada formato invisibles
     aunque ya estaban escritas en contentData.

     Tres decisiones:
     1 · Sin losa. La superficie es la del resto de módulos (SURFACE),
         así el Lab se siente parte de la app y no una ventana pegada.
     2 · La receta arriba y siempre visible: Formato ✕ Línea → Generate.
         Es literalmente lo que hace el módulo; que se lea de un vistazo.
     3 · Filas separadas por hairlines, no tarjetas anidadas, y la
         descripción del formato a la vista: en desktop sobra el ancho
         para explicar en qué consiste cada uno.

     Móvil queda intacto: ahí el bottom sheet y las columnas compactas
     son el gesto correcto.
     ═══════════════════════════════════════════════════════════════ */
  if (isDesktop) {
    const addingFormat = view === "add-format";
    const addingLine = view === "add-line";

    const composer = (onSubmit: () => void, placeholder: string, hint: string) => (
      <div className="border-t border-white/[0.05] px-3.5 py-3">
        <p className="mb-2 text-[11px] text-zinc-400">{hint}</p>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") { setView("matrix"); setNewName(""); }
            }}
            placeholder={placeholder}
            className="h-9 flex-1 rounded-xl border border-white/10 bg-black/25 px-3 text-[13px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/50"
          />
          <button
            onClick={onSubmit}
            disabled={!newName.trim()}
            className="h-9 rounded-xl bg-accent px-4 text-[12px] font-bold text-black transition disabled:opacity-30"
          >
            Add
          </button>
          <button
            onClick={() => { setView("matrix"); setNewName(""); }}
            className="h-9 rounded-xl px-2.5 text-zinc-500 transition hover:text-white"
            aria-label="Cancel"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );

    const addButton = (target: View) => (
      <button
        onClick={() => { setView(view === target ? "matrix" : target); setNewName(""); }}
        className="flex items-center gap-1 text-[10px] font-semibold text-zinc-500 transition hover:text-accent"
      >
        <Plus size={11} /> Add
      </button>
    );

    return (
      <div className="w-full">
        <RiseStyle />

        <header className="dd-rise">
          <h1 className="text-2xl font-bold tracking-tight text-white">Music Content Lab</h1>
          <p className="mt-1.5 max-w-[62ch] text-sm leading-relaxed text-zinc-400">
            Every idea is one format crossed with one content line. Pick one of each
            and Fennec writes the angle, then turns it into a script.
          </p>
        </header>

        {/* La receta. Es el módulo entero en una línea. */}
        <div
          className="dd-rise mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl px-5 py-4"
          style={{ ...SURFACE, animationDelay: "60ms" }}
        >
          <Slot
            label="Format"
            value={selectedFormat?.name ?? null}
            color={selectedFormat?.color}
            onClear={() => setSelectedFormat(null)}
          />
          <span className="text-zinc-600"><ArrowRight size={14} /></span>
          <Slot
            label="Content line"
            value={selectedLine?.name ?? null}
            onClear={() => setSelectedLine(null)}
          />

          <div className="ml-auto flex items-center gap-3">
            {genQuota ? (
              <span className="max-w-[40ch] text-right text-[11.5px] leading-snug text-accent">
                {genQuota}
              </span>
            ) : genError ? (
              <span className="max-w-[34ch] text-right text-[11.5px] leading-snug text-red-400">
                {genError}
              </span>
            ) : null}
            <button
              onClick={handleGenerate}
              disabled={!selectedFormat || !selectedLine || generating || !!genQuota}
              className="flex h-10 items-center gap-2 rounded-xl bg-accent px-5 text-[13px] font-bold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-25"
            >
              {generating
                ? <><Loader2 size={15} className="animate-spin" /> Generating…</>
                : <><Sparkles size={15} /> Generate &amp; write script</>}
            </button>
          </div>
        </div>

        {/* Los dos ejes. Formatos pesa más porque lleva descripción. */}
        <div className="mt-7 grid gap-7 lg:grid-cols-[1.15fr_1fr]">
          <Band label="Formats · how you present it" className="dd-rise" spacing="" action={addButton("add-format")}>
            <div className="mt-2 overflow-hidden rounded-2xl" style={SURFACE}>
              {formats.map((fmt, i) => (
                <Row
                  key={fmt.id}
                  first={i === 0}
                  selected={selectedFormat?.id === fmt.id}
                  onSelect={() => setSelectedFormat(selectedFormat?.id === fmt.id ? null : fmt)}
                  onDelete={fmt.isDefault ? undefined : () => deleteFormat(fmt.id)}
                  dot={fmt.color}
                  title={fmt.name}
                  description={fmt.description}
                />
              ))}
              {addingFormat && composer(
                addFormat,
                "e.g. YouTube Short",
                "How you present the content — the shape of the video.",
              )}
            </div>
          </Band>

          <Band label="Content lines · what you say" className="dd-rise" spacing="" action={addButton("add-line")}>
            <div className="mt-2 overflow-hidden rounded-2xl" style={SURFACE}>
              {lines.map((line, i) => (
                <Row
                  key={line.id}
                  first={i === 0}
                  selected={selectedLine?.id === line.id}
                  onSelect={() => setSelectedLine(selectedLine?.id === line.id ? null : line)}
                  onDelete={line.isDefault ? undefined : () => deleteLine(line.id)}
                  title={line.name}
                />
              ))}
              {addingLine && composer(
                addLine,
                "e.g. How X would sound like X",
                "The topic or template. Use X as the variable you swap each time.",
              )}
            </div>
          </Band>
        </div>
      </div>
    );
  }

  // ── Add views (móvil) ────────────────────────────────────────────────────────
  if (view === "add-format" || view === "add-line") {
    const isFormat = view === "add-format";
    return (
      <div className="flex flex-col bg-zinc-950 text-white">
        <div className="flex items-center gap-3 px-4 pt-5 pb-4 border-b border-white/5 shrink-0">
          <button
            onClick={() => { setView("matrix"); setNewName(""); }}
            className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X size={15} />
          </button>
          <p className="text-sm font-semibold text-white">
            {isFormat ? "New Format" : "New Content Line"}
          </p>
        </div>
        <div className="px-4 py-6 space-y-4">
          <p className="text-xs text-zinc-500">
            {isFormat
              ? "How you present the content, e.g. B-roll, Reel, Podcast clip"
              : "The topic or template. Use X as a variable, e.g. \"How X would sound like X\""}
          </p>
          <input
            type="text"
            value={newName}
            autoFocus
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (isFormat ? addFormat() : addLine())}
            placeholder={isFormat ? "e.g. YouTube Short" : "e.g. How X would sound like X"}
            className="w-full h-11 rounded-2xl border border-white/10 bg-zinc-900 px-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-amber-400/50 transition"
          />
          <button
            onClick={isFormat ? addFormat : addLine}
            disabled={!newName.trim()}
            className="w-full h-11 rounded-2xl bg-amber-400 text-black text-sm font-bold disabled:opacity-30 transition"
          >
            Add
          </button>
        </div>
      </div>
    );
  }

  // ── Main matrix view ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col bg-zinc-950 text-white">

      {/* Header */}
      <div className="px-4 pt-3 pb-3 shrink-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Music Content Lab</p>
        <p className="text-xs text-zinc-500 mt-0.5">Pick a format + a content line to combine.</p>
      </div>

      {/* Combination result */}
      {combination ? (
        <div className="mx-4 mb-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 px-4 py-3 flex items-center gap-3">
          <div
            className="h-8 w-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedFormat!.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-400 mb-0.5">Your idea</p>
            <p className="text-sm text-white leading-snug">{combination}</p>
          </div>
          <button
            onClick={() => { setSelectedFormat(null); setSelectedLine(null); }}
            className="text-zinc-600 hover:text-zinc-400 transition flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className="mx-4 mb-3 rounded-2xl border border-white/5 bg-zinc-900/50 px-4 py-3 flex items-center gap-2">
          <div className="flex items-center gap-2 text-zinc-600 text-xs">
            <span className={`px-2 py-0.5 rounded-full border ${selectedFormat ? "border-amber-400/50 text-amber-400" : "border-white/10"}`}>
              {selectedFormat ? selectedFormat.name : "Format"}
            </span>
            <ArrowRight size={12} />
            <span className={`px-2 py-0.5 rounded-full border ${selectedLine ? "border-amber-400/50 text-amber-400" : "border-white/10"}`}>
              {selectedLine ? selectedLine.name : "Content line"}
            </span>
          </div>
        </div>
      )}

      {/* Generate button */}
      {selectedFormat && selectedLine && (
        <div className="mx-4 mb-1 space-y-2">
          <button
            onClick={handleGenerate}
            disabled={generating || !!genQuota}
            className="w-full h-11 rounded-2xl bg-amber-400 text-black text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 transition"
          >
            {generating ? (
              <><Loader2 size={16} className="animate-spin" /> Generating...</>
            ) : (
              "Generate & Write Script"
            )}
          </button>
          {genQuota
            ? <p className="text-xs text-accent text-center leading-snug">{genQuota}</p>
            : genError && <p className="text-xs text-red-400 text-center">{genError}</p>}
        </div>
      )}

      {/* Two-column matrix */}
      <div className="flex gap-0" style={{ minHeight: 0 }}>

        {/* LEFT — Formats */}
        <div className="flex flex-col w-1/2 border-r border-white/5">
          <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-zinc-950 z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Formats</p>
            <button
              onClick={() => { setView("add-format"); setNewName(""); }}
              className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition"
            >
              <Plus size={11} />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-2 pb-4">
            {formats.map((fmt) => {
              const isSelected = selectedFormat?.id === fmt.id;
              return (
                <button
                  key={fmt.id}
                  onClick={() => setSelectedFormat(isSelected ? null : fmt)}
                  className={`group flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-left transition ${
                    isSelected ? "bg-zinc-800" : "hover:bg-zinc-900"
                  }`}
                >
                  <div
                    className="h-full w-1 rounded-full flex-shrink-0 self-stretch min-h-[2rem]"
                    style={{ backgroundColor: fmt.color }}
                  />
                  <span className={`text-xs leading-snug flex-1 ${isSelected ? "text-white font-medium" : "text-zinc-400"}`}>
                    {fmt.name}
                  </span>
                  {!fmt.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteFormat(fmt.id); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition flex-shrink-0"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Content Lines */}
        <div className="flex flex-col w-1/2">
          <div className="flex items-center justify-between px-3 py-2 sticky top-0 bg-zinc-950 z-10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Content Lines</p>
            <button
              onClick={() => { setView("add-line"); setNewName(""); }}
              className="h-5 w-5 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition"
            >
              <Plus size={11} />
            </button>
          </div>
          <div className="flex flex-col gap-1 px-2 pb-4">
            {lines.map((line) => {
              const isSelected = selectedLine?.id === line.id;
              return (
                <button
                  key={line.id}
                  onClick={() => setSelectedLine(isSelected ? null : line)}
                  className={`group flex items-start gap-2 rounded-xl px-2.5 py-2.5 text-left transition ${
                    isSelected ? "bg-zinc-800" : "hover:bg-zinc-900"
                  }`}
                >
                  <span className={`text-xs leading-snug flex-1 ${isSelected ? "text-white font-medium" : "text-zinc-400"}`}>
                    {line.name}
                  </span>
                  {!line.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteLine(line.id); }}
                      className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition flex-shrink-0 mt-0.5"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
