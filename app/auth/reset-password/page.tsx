"use client";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import FennecFox from "@/components/dashboard/FennecFox";

/* Landing page for the "reset your password" email link.
 * The shared supabase client has detectSessionInUrl + flowType:"pkce", so
 * it exchanges the link's ?code= for a session automatically on load — we
 * just wait for that (via onAuthStateChange's PASSWORD_RECOVERY event, with
 * a getSession() fallback in case the event already fired before we
 * subscribed) and then let the user set a new password. */

type Status = "checking" | "ready" | "invalid" | "done";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [status, setStatus]     = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setStatus("ready");
    });

    // Fallback: the PASSWORD_RECOVERY event only fires once, at the moment
    // detectSessionInUrl finishes — if that already happened before this
    // effect subscribed, fall back to "is there a session at all".
    supabase.auth.getSession().then(({ data }) => {
      setStatus((s) => (s === "checking" ? (data.session ? "ready" : "invalid") : s));
    });

    // If nothing resolves the link within a few seconds, it's genuinely bad/expired.
    const timeout = setTimeout(() => {
      setStatus((s) => (s === "checking" ? "invalid" : s));
    }, 4000);

    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout); };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setStatus("done");
    setTimeout(() => { window.location.href = "/"; }, 1800);
  }

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center gap-8 px-6"
      style={{ background: "#0b0a08" }}
    >
      <div className="flex flex-col items-center gap-1">
        <FennecFox isActive={false} glow={false} size={90} />
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-amber-500">Fennec</p>
      </div>

      <div className="w-full max-w-xs">
        {status === "checking" && (
          <p className="text-center text-sm text-zinc-500">Verifying your link…</p>
        )}

        {status === "invalid" && (
          <div className="space-y-3 text-center">
            <p className="text-sm font-semibold text-white">{t("rpEnlaceInvalido")}</p>
            <p className="text-xs text-zinc-500">{t("rpPideOtro")}</p>
            <a href="/" className="mt-2 inline-block text-xs font-semibold text-amber-500 underline underline-offset-2">
              Back to login
            </a>
          </div>
        )}

        {status === "done" && (
          <p className="text-center text-sm font-semibold text-green-400">Password updated. Taking you in…</p>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-2">
            <p className="mb-3 text-center text-sm font-semibold text-white">{t("rpNuevaContrasena")}</p>
            <input
              type="password"
              placeholder={t("pwNew")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoFocus
              className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
            />
            <input
              type="password"
              placeholder={t("pwConfirm")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full h-11 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full h-11 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
            >
              {saving ? "Saving..." : "Set password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
