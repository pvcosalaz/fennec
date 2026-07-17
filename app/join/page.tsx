"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import FennecFox from "@/components/dashboard/FennecFox";
import { GENRE_OPTIONS } from "@/lib/genres";

/* Waitlist / early-access landing for the Instagram campaign.
   Comment "Fennec" → DM link → capture email + name + genre into the
   `waitlist` table (see docs/waitlist.sql). Bilingual (ES default for the
   campaign audience, EN toggle) — the language is picked from ?lang=, then
   the browser, then falls back to Spanish; a toggle overrides it live. A
   ?src= param tags which video/link the signup came from. The genre list is
   the same catalog Settings uses (lib/genres.ts) — producer-focused. */

type Lang = "es" | "en";

const COPY: Record<Lang, {
  eyebrow: string; headline: string; sub: string;
  emailPh: string; namePh: string; genrePh: string;
  cta: string; ctaLoading: string;
  invalidEmail: string; genericError: string;
  finePrint: string; privacy: string;
  doneTitle: string; doneSub: string; instagram: string;
}> = {
  es: {
    eyebrow: "Acceso anticipado",
    headline: "Sé el primero en tener Fennec.",
    sub: "La app que centraliza el negocio del productor musical. Déjanos tu correo y te avisamos apenas abramos y en cada actualización.",
    emailPh: "tu@correo.com",
    namePh: "Tu nombre",
    genrePh: "¿Qué produces?",
    cta: "Unirme a la lista",
    ctaLoading: "Un momento…",
    invalidEmail: "Escribe un correo válido.",
    genericError: "Algo salió mal. Intenta de nuevo en un momento.",
    finePrint: "Sin spam. Solo lo importante.",
    privacy: "Privacidad",
    doneTitle: "¡Estás dentro!",
    doneSub: "Serás de los primeros en enterarte del lanzamiento de Fennec y de cada novedad. Sin spam, solo lo importante.",
    instagram: "Sígueme en Instagram →",
  },
  en: {
    eyebrow: "Early access",
    headline: "Be the first to get Fennec.",
    sub: "The app that centralizes the music producer's business. Drop your email and we'll tell you the moment we open and with every update.",
    emailPh: "you@email.com",
    namePh: "Your name",
    genrePh: "What do you produce?",
    cta: "Join the list",
    ctaLoading: "One sec…",
    invalidEmail: "Enter a valid email.",
    genericError: "Something went wrong. Try again in a moment.",
    finePrint: "No spam. Only what matters.",
    privacy: "Privacy",
    doneTitle: "You're in!",
    doneSub: "You'll be among the first to hear about Fennec's launch and every update. No spam, only what matters.",
    instagram: "Follow me on Instagram →",
  },
};

type State = "idle" | "submitting" | "done" | "error";

export default function JoinWaitlistPage() {
  const [lang,  setLang]  = useState<Lang>("es");
  const [email, setEmail] = useState("");
  const [name,  setName]  = useState("");
  const [genre, setGenre] = useState("");
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [src, setSrc] = useState<string | null>(null);

  const t = COPY[lang];

  // Pick language + campaign tag client-side: ?lang= wins, else the browser,
  // else Spanish (the campaign default). Reading here (not useSearchParams)
  // keeps the page statically renderable.
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const q = p.get("lang");
      if (q === "en" || q === "es") setLang(q);
      else if (!navigator.language?.toLowerCase().startsWith("es")) setLang("en");
      const s = p.get("src");
      if (s) setSrc(s.slice(0, 60));
    } catch { /* ignore */ }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) {
      setErrMsg(t.invalidEmail);
      setState("error");
      return;
    }
    setState("submitting");
    setErrMsg("");
    // Plain insert with return=minimal — NOT upsert. upsert/.select() ask
    // PostgREST to return the inserted row, which needs a SELECT policy; our
    // RLS is insert-only (the list stays private), so returning the row 401s.
    // 23505 = duplicate email = they're already on the list = success.
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: clean, name: name.trim() || null, genre: genre || null, source: src || "landing" });
    if (error && error.code !== "23505") {
      setErrMsg(t.genericError);
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

      {/* language toggle */}
      <div className="absolute right-5 top-5 z-20 flex overflow-hidden rounded-full border border-white/10 bg-white/[0.04] text-[11px] font-bold">
        {(["es", "en"] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`px-3 py-1.5 uppercase tracking-wider transition ${
              lang === l ? "bg-accent text-black" : "text-zinc-400 hover:text-white"
            }`}
            aria-pressed={lang === l}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="relative w-full max-w-md">
        {/* fox logo + wordmark — same mark as the app's login */}
        <div className="mb-8 flex flex-col items-center">
          <FennecFox isActive={false} glow={false} size={84} />
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold tracking-tight text-white" style={{ letterSpacing: "-0.03em" }}>
              fennec
            </span>
            <span className="mb-1 inline-block h-[7px] w-[7px] rounded-full" style={{ background: "#f5a623", boxShadow: "0 0 10px rgba(245,166,35,0.9)" }} />
          </div>
        </div>

        {state === "done" ? (
          <div className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "rgba(245,166,35,0.14)" }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#f5a623" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">{t.doneTitle}</h1>
            <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-zinc-400">{t.doneSub}</p>
            <a
              href="https://instagram.com/pacosalaz"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-8 inline-block text-sm font-semibold text-accent transition hover:brightness-110"
            >
              {t.instagram}
            </a>
          </div>
        ) : (
          <>
            <div className="text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-accent">{t.eyebrow}</p>
              <h1 className="mt-4 text-[28px] font-bold leading-tight text-white">{t.headline}</h1>
              <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-zinc-400">{t.sub}</p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-3">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
                placeholder={t.emailPh}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
              />
              <input
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePh}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] text-white outline-none transition placeholder:text-zinc-600 focus:border-accent/60"
              />
              <select
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-white/10 bg-white/[0.04] px-4 text-[15px] outline-none transition focus:border-accent/60"
                style={{ color: genre ? "#fff" : "#71717a" }}
              >
                <option value="" disabled style={{ color: "#71717a" }}>{t.genrePh}</option>
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g} style={{ color: "#000" }}>{g}</option>
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
                {state === "submitting" ? t.ctaLoading : t.cta}
              </button>
            </form>

            <p className="mt-5 text-center text-[12px] leading-relaxed text-zinc-600">
              {t.finePrint}{" "}
              <a href="/privacy" className="underline transition hover:text-zinc-400">{t.privacy}</a>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
