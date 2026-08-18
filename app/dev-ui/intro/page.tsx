"use client";

// Dev-only, 404s in production. TapeIntro vive detrás del flyout "⋯" y solo
// aparece en la primera visita, así que revisarlo de vista costaba navegar
// media app. Aquí se abre en las dos variantes (escritorio y móvil) porque el
// copy cambia según el gesto.

import { useState } from "react";
import { notFound } from "next/navigation";
import TapeIntro from "@/components/audio/TapeIntro";
import i18n from "@/lib/i18n";

export default function DevIntro() {
  if (process.env.NODE_ENV === "production") notFound();
  const [variante, setVariante] = useState<"desktop" | "mobile" | null>("desktop");

  return (
    <main className="min-h-screen bg-[#0b0a08] p-8">
      <div className="flex gap-2">
        {(["desktop", "mobile"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVariante(v)}
            className={`h-9 rounded-xl border px-4 text-xs font-semibold transition ${
              variante === v
                ? "border-white/30 text-white"
                : "border-white/10 text-zinc-500 hover:text-white"
            }`}
          >
            {v}
          </button>
        ))}
        <span className="mx-2 w-px bg-white/10" />
        {(["en", "es"] as const).map((l) => (
          <button
            key={l}
            onClick={() => { void i18n.changeLanguage(l); setVariante((v) => v); }}
            className="h-9 rounded-xl border border-white/10 px-4 text-xs font-semibold uppercase text-zinc-500 transition hover:text-white"
          >
            {l}
          </button>
        ))}
      </div>

      {variante && (
        <TapeIntro
          isDesktop={variante === "desktop"}
          onClose={() => setVariante(null)}
          onUpload={() => setVariante(null)}
        />
      )}
    </main>
  );
}
