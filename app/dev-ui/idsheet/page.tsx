"use client";

// Dev-only, 404s en produccion. El despliegue del Fennec ID vive detras de un
// perfil de Community, que pide sesion y navegacion: aqui se abre suelto para
// poder mirarle la animacion y las medidas.

import { useState } from "react";
import { notFound } from "next/navigation";
import FennecIdSheet from "@/components/network/FennecIdSheet";
import type { Profile } from "@/lib/communityTypes";

const PERFIL = {
  id: "00000000-0000-0000-0000-000000000005",
  username: "ricobeltran", display_name: "Rico Beltrán",
  avatar_url: null, is_pro: false, is_bot: false,
  fennec_db_score: 76, fennec_number: 5,
  created_at: new Date(0).toISOString(), bio: null,
  genres: ["Corridos"], worked_with: null, worked_in: null,
  banner_url: null, studio_photo_url: null, studio_photo_luma: null,
  role: "Singer", country: "Mexico",
  instagram: "ricobeltran", spotify: null, youtube_url: null, tiktok: null,
  color_id: "amber",
} as Profile;

export default function DevIdSheet() {
  if (process.env.NODE_ENV === "production") notFound();
  const [abierto, setAbierto] = useState(false);
  const [color, setColor] = useState("amber");

  return (
    <main className="min-h-screen bg-[#0b0a08] p-8 text-white">
      <div className="mx-auto max-w-md space-y-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          Fennec ID · despliegue
        </p>
        <div className="flex flex-wrap gap-2">
          {["amber", "blue", "lime", "rose"].map((c) => (
            <button key={c} onClick={() => setColor(c)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${
                color === c ? "border-white/40 text-white" : "border-white/10 text-zinc-500"
              }`}>{c}</button>
          ))}
        </div>
        <button
          onClick={() => setAbierto(true)}
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] bg-white/[0.05] px-4 py-2
                     font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white
                     transition hover:border-white/25 hover:bg-white/[0.09] active:scale-[0.97]"
        >
          Fennec ID
        </button>
        <p className="text-[13px] leading-relaxed text-zinc-500">
          Abre, cierra con Escape o tocando el fondo. Lo que se mira aquí: que entre
          con rebote y salga sin él, que las acciones lleguen después de la tarjeta,
          y que nada se salga de la pantalla.
        </p>
      </div>

      <FennecIdSheet
        profile={{ ...PERFIL, color_id: color }}
        open={abierto}
        onClose={() => setAbierto(false)}
      />
    </main>
  );
}
