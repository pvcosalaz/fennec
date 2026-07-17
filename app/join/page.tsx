"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

/* Waitlist / early-access landing for the Instagram campaign.
   Comment "Fennec" → DM with this link → capture email + name + role into the
   `waitlist` table (see docs/waitlist.sql). Copy is Spanish for the campaign
   audience; the app itself stays English. A ?src= param tags which video/link
   the signup came from. */

const ROLES = [
  { value: "producer", label: "Productor / Compositor" },
  { value: "artist",   label: "Artista" },
  { value: "label",    label: "Sello / Manager" },
  { value: "other",    label: "Otro" },
];

type State = "idle" | "submitting" | "done" | "error";

export default function JoinWaitlistPage() {
  const [email, setEmail] = useState("");
  const [name,  setName]  = useState("");
  const [role,  setRole]  = useState("");
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [src, setSrc] = useState<string | null>(null);

  // Read the campaign tag client-side (avoids the useSearchParams Suspense
  // requirement and keeps the page statically renderable).
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get("src");
      if (p) setSrc(p.slice(0, 60));
    } catch { /* ignore */ }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErrMsg("Escribe un correo válido.");
      setState("error");
      return;
    }
    setState("submitting");
    setErrMsg("");
    // Plain insert with return=minimal — NOT upsert. upsert/.select() ask
    // PostgREST to return the inserted row, which needs a SELECT policy; our
    // RLS is insert-only (the list stays private), so returning the row 401s
    // with "violates row-level security". A bare insert never reads back.
    // 23505 = duplicate email = they're already on the list, which for a
    // waitlist is success, not an error.
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: clean, name: name.trim() || null, role: role || null, source: src || "landing" });
    if (error && error.code !== "23505") {
      setErrMsg("Algo salió mal. Intenta de nuevo en un momento.");
      setState("error");
      return;
    }
    setState("done");
  }

  return (
    <main
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6 py-12"
      style={{ background: "#0b0a08" }}
    >
      {/* ambient amber glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(120% 80% at 50% -10%, rgba(245,166,35,0.14), transparent 60%)" }}
      />

      <div className="relative w-full max-w-md">
        {/* wordmark */}
        <div className="mb-10 flex items-baseline justify-center gap-1">
          <span className="text-3xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>
            fennec
          </span>
          <span className="mb-1 inline-block h-[7px] w-[7px] rounded-full" style={{ background: "#f5a623", boxShadow: "0 0 10px rgba(245,166,35,0.9)" }} />
        </div>

        {state === "done" ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(245,166,35,0.14)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">¡Estás dentro!</h1>
            <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-zinc-400">
              Serás de los primeros en enterarte del lanzamiento de Fennec y de cada novedad. Sin spam, solo lo importante.
            </p>
            <a
              href="https://instagram.com/pacosalaz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block text-sm font-semibold text-accent transition hover:brightness-110"
            >
              Sígueme en Instagram →
            </a>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">Acceso anticipado</p>
              <h1 className="mt-4 text-[28px] font-bold leading-tight text-white">
                Sé el primero en tener Fennec.
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-zinc-400">
                La app que centraliza el negocio del productor musical. Déjanos tu correo y te avisamos apenas abramos y en cada actualización.
              </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
                placeholder="tu@correo.com"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
              />
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] outline-none transition focus:border-accent/60"
                style={{ color: role ? "#fff" : "#71717a" }}
              >
                <option value="" disabled style={{ color: "#71717a" }}>¿Qué haces?</option>
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value} style={{ color: "#000" }}>{r.label}</option>
                ))}
              </select>

              {state === "error" && (
                <p className="text-center text-[13px] text-red-400">{errMsg}</p>
              )}

              <button
                type="submit"
                disabled={state === "submitting"}
                className="h-12 w-full rounded-xl bg-accent text-[15px] font-bold text-black transition hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              >
                {state === "submitting" ? "Un momento…" : "Unirme a la lista"}
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-zinc-600">
              Sin spam. Solo lo importante.{" "}
              <a href="/privacy" className="underline transition hover:text-zinc-400">Privacidad</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
