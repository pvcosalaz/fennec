"use client";

// Dev-only, 404s en produccion. Monta el Dashboard REAL (el contenedor, no el
// presentacional de /dev-ui/shell) para poder observar dos cosas que solo se
// ven con el ciclo de vida completo: cuando se escribe el dB a la base, y si
// avisarle al shell provoca un bucle de renders.
//
// Sin sesion las consultas fallan, pero el ORDEN de las llamadas —que es lo
// que aqui se mide— es el mismo.

import { useRef, useState } from "react";
import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import type { Profile } from "@/lib/communityTypes";

const PERFIL: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "devtest", avatar_url: null, is_pro: false, is_bot: false,
  fennec_db_score: 61, created_at: new Date(0).toISOString(), bio: null, genres: [],
  worked_with: null, worked_in: null, banner_url: null, studio_photo_url: null,
  studio_photo_luma: null, display_name: "Dev Test", role: "Composer",
  country: "Mexico", instagram: "x", spotify: null, youtube_url: null,
  tiktok: null, color_id: null,
  ig_followers: 37741, tiktok_followers: 84300, yt_subscribers: 4830,
} as Profile;

export default function DevDb() {
  if (process.env.NODE_ENV === "production") notFound();
  const [perfil, setPerfil] = useState<Profile>(PERFIL);
  const renders = useRef(0);
  renders.current += 1;

  return (
    <main className="min-h-screen bg-[#0b0a08] p-6 text-white">
      <p className="mb-4 font-mono text-xs text-amber-500">
        dB del perfil (lo que veria la barra lateral): {perfil.fennec_db_score}
        {"  ·  renders del padre: "}{renders.current}
      </p>
      <Dashboard
        avatarUrl={null}
        username={perfil.username}
        isPro={false}
        userId={perfil.id}
        networkProfile={perfil}
        onDbScore={(score) => {
          (window as unknown as { __dbAvisos: number[] }).__dbAvisos ??= [];
          (window as unknown as { __dbAvisos: number[] }).__dbAvisos.push(score);
          setPerfil((prev) => prev.fennec_db_score !== score
            ? { ...prev, fennec_db_score: score } : prev);
        }}
        onOpenSettings={() => {}}
        onOpenProfileSettings={() => {}}
        onNavigate={() => {}}
        onOpenCalculator={() => {}}
      />
    </main>
  );
}
