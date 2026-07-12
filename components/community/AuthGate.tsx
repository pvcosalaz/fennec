"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import FennecFox from "@/components/dashboard/FennecFox";

export default function AuthGate() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [message, setMessage]   = useState<string | null>(null);

  async function handleApple() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleFacebook() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.message.includes("Invalid login")) {
      // Try sign up
      const { error: signUpErr } = await supabase.auth.signUp({ email, password });
      if (signUpErr) {
        setError(signUpErr.message);
      } else {
        setMessage("Check your email to confirm your account.");
      }
    } else if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-full flex-1 px-6 gap-8 overflow-hidden"
      style={{ background: "#0b0a08" }}
    >
      {/* ── ambient glow field + floating orbs (same treatment as the landing) ── */}
      <div className="ag-ambient" aria-hidden="true" />
      <div className="ag-orbs" aria-hidden="true">
        <span className="ag-orb ag-o1" />
        <span className="ag-orb ag-o2" />
        <span className="ag-orb ag-o3" />
      </div>
      <div className="ag-grain" aria-hidden="true" />

      {/* content sits above the atmosphere */}
      <div className="relative z-10 flex w-full flex-col items-center gap-8">
      {/* Logo + branding */}
      <div className="flex flex-col items-center gap-1">
        <div style={{ marginTop: 10 }}>
          <FennecFox isActive={false} glow={false} size={100} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-semibold tracking-[0.35em] text-amber-500 uppercase">Fennec</p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Your music business<br />& community hub.
          </h1>
        </div>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button
          onClick={handleApple}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.08l.01.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </button>

        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={handleFacebook}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white hover:bg-white/10 transition disabled:opacity-50"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Continue with Facebook
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-zinc-600">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-2">
          <input
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-green-400">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
          >
            {loading ? "Loading..." : "Log in / Sign up"}
          </button>
        </form>

        {/* Consent notice — required by App Store / Play Store before an
            account is created. Passive consent under the sign-in controls
            is the standard pattern (no blocking modal). */}
        <p className="pt-1 text-center text-[11px] leading-relaxed text-zinc-500">
          By continuing, you agree to Fennec&apos;s{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-2 hover:text-white">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-zinc-400 underline underline-offset-2 hover:text-white">
            Privacy Policy
          </a>.
        </p>
      </div>
      </div>{/* end content wrapper */}

      <style>{`
        .ag-ambient {
          position:absolute; inset:-25%; z-index:0; pointer-events:none;
          background:
            radial-gradient(34% 30% at 78% 14%, rgba(245,166,35,.30), transparent 64%),
            radial-gradient(30% 28% at 10% 32%, rgba(245,166,35,.16), transparent 66%),
            radial-gradient(42% 36% at 60% 88%, rgba(224,128,42,.26), transparent 64%);
          filter: blur(8px); will-change: transform;
          animation: agDrift 26s ease-in-out infinite alternate;
        }
        @keyframes agDrift {
          0%   { transform: translate3d(0,0,0) scale(1); }
          50%  { transform: translate3d(-3%,2.5%,0) scale(1.08); }
          100% { transform: translate3d(3%,-2%,0) scale(1.04); }
        }
        .ag-orbs { position:absolute; inset:0; z-index:0; pointer-events:none; overflow:hidden; }
        .ag-orb {
          position:absolute; border-radius:50%; pointer-events:none;
          mix-blend-mode:screen; opacity:.10; filter:blur(36px); will-change: transform;
        }
        .ag-o1 { width:320px; height:320px; left:58%; top:2%;
          background:radial-gradient(circle at 38% 32%, rgba(245,166,35,.5), rgba(245,166,35,.16) 48%, transparent 72%);
          animation: agFloat1 24s ease-in-out infinite alternate; }
        .ag-o2 { width:220px; height:220px; left:-12%; top:52%;
          background:radial-gradient(circle at 38% 32%, rgba(255,201,92,.42), rgba(245,166,35,.13) 50%, transparent 72%);
          animation: agFloat2 19s ease-in-out infinite alternate; }
        .ag-o3 { width:260px; height:260px; left:60%; top:76%; filter:blur(44px);
          background:radial-gradient(circle at 40% 35%, rgba(224,128,42,.34), rgba(224,128,42,.1) 52%, transparent 74%);
          animation: agFloat3 28s ease-in-out infinite alternate; }
        @keyframes agFloat1 { from{transform:translate(0,0)} to{transform:translate(-24px,30px)} }
        @keyframes agFloat2 { from{transform:translate(0,0)} to{transform:translate(28px,-22px)} }
        @keyframes agFloat3 { from{transform:translate(0,0)} to{transform:translate(-20px,-28px)} }
        .ag-grain {
          position:absolute; inset:0; z-index:1; pointer-events:none; opacity:.055;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:200px 200px;
        }
        @media (prefers-reduced-motion: reduce) {
          .ag-ambient, .ag-orb { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
