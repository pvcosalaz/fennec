"use client";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { createProfile, isUsernameTaken } from "@/lib/communityDb";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  userId: string;
  avatarUrl: string | null;
  onComplete: (profile: Profile) => void;
};

export default function UsernameSetup({ userId, avatarUrl, onComplete }: Props) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length < 3) { setError("At least 3 characters (letters, numbers, _)"); return; }
    setLoading(true);
    setError(null);
    const taken = await isUsernameTaken(clean);
    if (taken) { setError("That username is already taken"); setLoading(false); return; }
    try {
      const profile = await createProfile(userId, clean, avatarUrl);
      onComplete(profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error creating profile");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-bold text-white">{t("cmEligeUsuario")}</h2>
        <p className="text-sm text-zinc-500">{t("cmAsiTeVeran")}</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t("cmTuUsuario")}
            maxLength={30}
            required
            className="w-full h-11 rounded-xl border border-white/10 bg-white/5 pl-7 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-amber-500"
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={loading || username.trim().length < 3}
          className="w-full h-11 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition disabled:opacity-50"
        >
          {loading ? "Saving..." : "Enter the feed →"}
        </button>
      </form>
    </div>
  );
}
