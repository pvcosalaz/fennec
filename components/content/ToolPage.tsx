"use client";

import { ArrowLeft } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   TOOL PAGE — el chrome compartido de las herramientas que se
   apoderan de la pantalla (escribir guion, ver guion).

   Las dos nacieron como `fixed inset-0 z-[130]` con `pt-12` para el
   notch, que es lo correcto en teléfono. En desktop ese mismo takeover
   se sale del shell: tapa la barra lateral, el contenido queda cortado
   por la izquierda, y el botón Save aterriza justo encima del avatar y
   la campana que viven pegados al borde derecho de la ventana
   (Paco 2026-08-02).

   En desktop la app ya tiene un patrón para esto y está escrito en
   ContentModule: la herramienta activa es una PÁGINA dentro del área de
   contenido, con un "Back" arriba. Eso es lo que hace este componente,
   para que las dos pantallas lo hereden en vez de cada una inventarlo.

   El Teleprompter no pasa por aquí a propósito: ahí el takeover a
   pantalla completa sí es lo que quieres, en cualquier dispositivo.
   ═══════════════════════════════════════════════════════════════ */

export default function ToolPage({
  isDesktop, eyebrow, onBack, actions, footer, children,
}: {
  isDesktop: boolean;
  /** Qué es esta pantalla. En móvil va como kicker; en desktop es el título. */
  eyebrow: string;
  onBack: () => void;
  /** Save / editar / borrar. Mismos botones en ambos, distinto sitio. */
  actions?: React.ReactNode;
  /** Acciones ancladas abajo (agendar, teleprompter). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isDesktop) {
    return (
      <div className="w-full">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-400 transition hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <div className="mb-6 flex items-start justify-between gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">{eyebrow}</h1>
          {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
        </div>

        <div className="space-y-5">{children}</div>

        {footer && <div className="mt-8 flex flex-wrap gap-3">{footer}</div>}
      </div>
    );
  }

  return (
    // z-[130]: el takeover tiene que quedar ARRIBA del nav inferior, cuyo
    // backdrop-blur pinta sobre un z-50 pelón.
    <div className="fixed inset-0 z-[130] flex flex-col overflow-hidden bg-zinc-950">
      <div className="flex shrink-0 items-center gap-3 border-b border-white/5 px-4 pb-4 pt-12">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-zinc-400 transition hover:text-white"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-widest text-zinc-500">{eyebrow}</p>
        </div>
        {actions}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">{children}</div>

      {footer && (
        <div
          className="shrink-0 space-y-2 border-t border-white/5 px-4 pt-3"
          style={{ paddingBottom: "max(calc(env(safe-area-inset-bottom) + 12px), 2rem)" }}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
