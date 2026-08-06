"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FennecFox from "@/components/dashboard/FennecFox";

type OAuthProvider = "apple" | "google" | "facebook";

export default function AuthGate() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [message, setMessage]   = useState<string | null>(null);
  // Set to the email we just signed up, so we can offer a "Resend" button
  // (the confirmation mail can land in spam or never arrive).
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);
  const [resent, setResent]     = useState(false);

  // Which OAuth providers are actually enabled on the Supabase project.
  // Clicking a disabled provider used to navigate the browser straight into
  // Supabase's raw 400 JSON ("Unsupported provider") — that was the whole
  // "Facebook login doesn't work" bug. The settings endpoint is public, so we
  // ask once and refuse the redirect for anything that's off. null = unknown
  // (fetch failed) → let clicks through rather than block a working provider.
  const [enabledProviders, setEnabledProviders] = useState<Record<string, boolean> | null>(null);
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => r.json())
      .then((d) => { if (d?.external) setEnabledProviders(d.external); })
      .catch(() => {});
  }, []);

  async function handleOAuth(provider: OAuthProvider, label: string) {
    setError(null);
    setMessage(null);
    if (enabledProviders && enabledProviders[provider] === false) {
      setError(`${label} sign-in isn't available yet. Please use Google or email for now.`);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setLoading(false); }
  }

  const handleApple    = () => handleOAuth("apple", "Apple");
  const handleGoogle   = () => handleOAuth("google", "Google");
  const handleFacebook = () => handleOAuth("facebook", "Facebook");

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    setPendingConfirmEmail(null);
    setResent(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error?.message.includes("Invalid login")) {
      // Try sign up
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (signUpErr) {
        setError(signUpErr.message);
      } else {
        setMessage("Check your email to confirm your account.");
        setPendingConfirmEmail(email.trim());
      }
    } else if (error) {
      setError(error.message);
    }
    setLoading(false);
  }

  async function handleResendConfirm() {
    if (!pendingConfirmEmail) return;
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: pendingConfirmEmail,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setResent(true);
  }

  async function handleForgotPassword() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Enter your email above first, then tap \"Forgot password?\".");
      return;
    }
    setLoading(true);
    // Supabase itself doesn't reveal whether the email has an account (it
    // returns success either way), so a real error here is a genuine
    // problem (rate limit, bad format) worth surfacing as-is.
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) setError(error.message);
    else setMessage("Check your email for a link to reset your password.");
    setLoading(false);
  }

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-full flex-1 px-6 gap-8 overflow-hidden"
      style={{ background: "#0b0a08" }}
    >
      {/* ── slow aurora field ──
          Three wide, heavily blurred washes drifting at different speeds, so
          the gradient recomposes instead of reading as separate blobs. The
          grain on top dithers whatever banding survives. */}
      <div className="ag-aurora" aria-hidden="true">
        <span className="ag-wash ag-w1" />
        <span className="ag-wash ag-w2" />
        <span className="ag-wash ag-w3" />
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
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={loading}
              className="text-xs text-zinc-500 underline-offset-2 hover:text-amber-500 hover:underline transition disabled:opacity-50"
            >
              Forgot password?
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {message && <p className="text-xs text-green-400">{message}</p>}
          {/* After a signup, offer to resend the confirmation mail — it can
              land in spam or never arrive, leaving the user stuck. */}
          {pendingConfirmEmail && (
            resent ? (
              <p className="text-xs text-zinc-500">Confirmation email sent again.</p>
            ) : (
              <button
                type="button"
                onClick={handleResendConfirm}
                disabled={loading}
                className="text-xs text-zinc-500 underline-offset-2 hover:text-amber-500 hover:underline transition disabled:opacity-50"
              >
                Didn&apos;t get it? Resend confirmation email
              </button>
            )
          )}
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
        /* The whole field blurs as one. A single large blur beats per-orb
           blurs: it smears the seams between washes too, so nothing reads as
           a discrete blob with an edge. */
        /* Bleeds past the viewport on purpose, and does NOT clip: a blur inside
           an overflow:hidden box samples the empty space beyond its edges and
           fades the field out around the rim. The page root already clips. */
        .ag-aurora {
          position:absolute; inset:-30%; z-index:0; pointer-events:none;
          filter: blur(56px) saturate(115%);
        }
        /* Each wash is centred on its own point via translate(-50%,-50%) — kept
           inside the keyframes, since animating transform would drop it.
           closest-side ties the falloff to the element box, so the multi-stop
           ramp below lands the same way at any viewport size. */
        .ag-wash {
          position:absolute; border-radius:50%;
          will-change: transform; mix-blend-mode: screen;
        }
        /* Eight stops, not two.
           [UI 2026-08-05] going colour to transparent in one hop is what made these
           band: over a near-black page that ramp crosses only a handful of
           8-bit luminance levels, and the display quantises it into rings.
           Same fix as The Tape's reactive glow (2026-08-04): hand-rolled
           gaussian-ish falloff, then grain on top to dither the remainder. */
        /* Same three anchors as the old orbs (top-right, mid-left, lower-right)
           so the composition is unchanged — only the falloff and the pace are. */
        .ag-w1 {
          width:78vmax; height:78vmax; left:74%; top:24%;
          background: radial-gradient(closest-side,
            rgba(245,166,35,.42) 0%,   rgba(245,166,35,.370) 13%,
            rgba(245,166,35,.300) 26%, rgba(245,166,35,.224) 39%,
            rgba(245,166,35,.151) 52%, rgba(245,166,35,.089) 65%,
            rgba(245,166,35,.043) 78%, rgba(245,166,35,.015) 89%,
            rgba(245,166,35,0) 100%);
          animation: agW1 58s ease-in-out infinite alternate;
        }
        .ag-w2 {
          width:62vmax; height:62vmax; left:14%; top:62%;
          background: radial-gradient(closest-side,
            rgba(255,201,92,.30) 0%,   rgba(255,201,92,.264) 13%,
            rgba(255,201,92,.214) 26%, rgba(255,201,92,.159) 39%,
            rgba(255,201,92,.107) 52%, rgba(255,201,92,.063) 65%,
            rgba(255,201,92,.030) 78%, rgba(255,201,92,.011) 89%,
            rgba(255,201,92,0) 100%);
          animation: agW2 74s ease-in-out infinite alternate;
        }
        .ag-w3 {
          width:70vmax; height:70vmax; left:68%; top:88%;
          background: radial-gradient(closest-side,
            rgba(224,128,42,.36) 0%,   rgba(224,128,42,.316) 13%,
            rgba(224,128,42,.256) 26%, rgba(224,128,42,.190) 39%,
            rgba(224,128,42,.128) 52%, rgba(224,128,42,.075) 65%,
            rgba(224,128,42,.036) 78%, rgba(224,128,42,.013) 89%,
            rgba(224,128,42,0) 100%);
          animation: agW3 66s ease-in-out infinite alternate;
        }
        /* Slow, and no two cycles in step, so the field never visibly repeats.
           The -50% pair centres the wash on its left/top anchor and has to be
           repeated in every frame: transform replaces, it doesn't accumulate. */
        @keyframes agW1 {
          0%   { transform: translate(-50%,-50%) scale(1); }
          100% { transform: translate(-54%,-45%) scale(1.16); }
        }
        @keyframes agW2 {
          0%   { transform: translate(-50%,-50%) scale(1.08); }
          100% { transform: translate(-45%,-55%) scale(1); }
        }
        @keyframes agW3 {
          0%   { transform: translate(-50%,-50%) scale(1.1); }
          100% { transform: translate(-55%,-56%) scale(1); }
        }
        /* Sits above the field so it dithers it. Drifts on its own slow cycle:
           a static grain over moving colour lets the eye track the bands
           sliding underneath a fixed texture. */
        .ag-grain {
          position:absolute; inset:-50%; z-index:1; pointer-events:none; opacity:.07;
          background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.68' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size:200px 200px;
          animation: agGrain 42s steps(6) infinite;
        }
        @keyframes agGrain {
          0%,100% { transform: translate3d(0,0,0); }
          16%     { transform: translate3d(-1.5%,1%,0); }
          33%     { transform: translate3d(1%,-1.5%,0); }
          50%     { transform: translate3d(-1%,-1%,0); }
          66%     { transform: translate3d(1.5%,1.5%,0); }
          83%     { transform: translate3d(-.5%,1.5%,0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .ag-wash, .ag-grain { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
