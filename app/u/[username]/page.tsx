"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserPlus, Check, Loader2 } from "lucide-react";
import FennecIdCard from "@/components/network/FennecIdCard";
import { getColorScheme } from "@/lib/fennecIdPalette";
import { getInitials, getFirstLast } from "@/components/network/utils";
import { fetchPublicProfile, requestConnection } from "@/lib/networkDb";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/communityTypes";

/* Public, read-only Fennec ID — the exact hook a v2 physical NFC card
   will point at. Route is /u/[username], NOT /@[username]: an @-prefixed
   folder is the Next.js app-router parallel-routes convention and would
   break the build. */

type RequestState = "idle" | "sending" | "sent" | "signed_out";

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined); // undefined = loading
  const [requestState, setRequestState] = useState<RequestState>("idle");

  useEffect(() => {
    if (!params.username) return;
    fetchPublicProfile(params.username).then(setProfile);
  }, [params.username]);

  async function handleRequest() {
    if (!profile || requestState === "sending" || requestState === "sent") return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRequestState("signed_out"); return; }
    setRequestState("sending");
    const ok = await requestConnection(profile.id);
    setRequestState(ok ? "sent" : "idle");
  }

  if (profile === undefined) {
    return (
      <main className="min-h-dvh flex items-center justify-center" style={{ background: "#0d0d0f" }}>
        <Loader2 className="h-5 w-5 text-zinc-600 animate-spin" />
      </main>
    );
  }

  if (profile === null) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-2 px-6" style={{ background: "#0d0d0f" }}>
        <p className="text-sm font-semibold text-white">Producer not found</p>
        <p className="text-xs text-zinc-600">This Fennec ID doesn&rsquo;t exist.</p>
      </main>
    );
  }

  const scheme = getColorScheme(profile.color_id);
  const { firstName, lastName } = getFirstLast(profile);

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6 py-16" style={{ background: "#0d0d0f" }}>
      <div className="w-full max-w-sm">
        <FennecIdCard
          firstName={firstName}
          lastName={lastName}
          role={profile.role ?? "Producer"}
          country={profile.country ?? ""}
          genres={profile.genres ?? []}
          fennecDb={profile.fennec_db_score}
          colorScheme={scheme}
          collectionNumber={profile.fennec_number ?? undefined}
          initials={getInitials(profile)}
          avatarUrl={profile.avatar_url}
          instagram={profile.instagram}
          spotify={profile.spotify}
          youtube={profile.youtube_url}
          hideZeroDb
        />
      </div>

      <button
        onClick={handleRequest}
        disabled={requestState === "sending" || requestState === "sent"}
        className="flex items-center gap-2 rounded-2xl bg-accent px-6 py-3 text-sm font-bold text-black transition hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
      >
        {requestState === "sending" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : requestState === "sent" ? (
          <Check className="h-4 w-4" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {requestState === "sent" ? "Request sent" : "Request to connect"}
      </button>

      {requestState === "signed_out" && (
        <p className="text-xs text-zinc-500 text-center">
          <a href="https://app.fennec.audio" className="text-accent underline">Open Fennec</a> and sign in to connect.
        </p>
      )}

      <p className="text-[11px] text-zinc-700 uppercase tracking-[0.25em]">Fennec &middot; fennec.audio</p>
    </main>
  );
}
