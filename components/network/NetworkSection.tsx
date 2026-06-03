// components/network/NetworkSection.tsx
"use client";

import { useEffect, useState } from "react";
import FennecIdCard from "./FennecIdCard";
import NetworkCollection from "./NetworkCollection";
import { ensureColorAssigned, getNetworkContacts } from "@/lib/networkDb";
import { getColorScheme } from "@/lib/fennecIdPalette";
import type { Profile } from "@/lib/communityTypes";

type Props = {
  profile: Profile;
  /** Callback to update the profile in parent state after color is assigned */
  onColorAssigned: (colorId: string) => void;
  userId: string;
};

function getInitials(profile: Profile): string {
  const name = profile.display_name || profile.username || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function getFirstLast(profile: Profile): { firstName: string; lastName: string } {
  const name = profile.display_name || profile.username || "Unknown";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: name, lastName: "" };
}

export default function NetworkSection({ profile, onColorAssigned, userId }: Props) {
  const [resolvedColorId, setResolvedColorId] = useState<string | null>(profile.color_id);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);

  // Assign color on first load if not set
  useEffect(() => {
    ensureColorAssigned(userId, profile.color_id).then((colorId) => {
      if (colorId !== profile.color_id) {
        setResolvedColorId(colorId);
        onColorAssigned(colorId);
      }
    });
  }, [userId, profile.color_id, onColorAssigned]);

  // Load network contacts
  useEffect(() => {
    setLoadingContacts(true);
    getNetworkContacts(userId)
      .then(setContacts)
      .finally(() => setLoadingContacts(false));
  }, [userId]);

  const colorScheme = getColorScheme(resolvedColorId);
  const { firstName, lastName } = getFirstLast(profile);

  return (
    <div className="flex flex-col gap-5">
      {/* Section header */}
      <div>
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">Network</p>
        <h2 className="mt-1 text-xl font-bold text-white">Tu Fennec ID</h2>
        <p className="mt-1 text-xs text-zinc-500">Comparte tu ID en persona para conectar con otros productores.</p>
      </div>

      {/* Own card */}
      <FennecIdCard
        firstName={firstName}
        lastName={lastName}
        role={profile.role ?? "Producer"}
        country={profile.country ?? ""}
        genres={profile.genres ?? []}
        fennecDb={profile.fennec_db_score}
        colorScheme={colorScheme}
        initials={getInitials(profile)}
        instagram={profile.instagram}
        tiktok={profile.tiktok}
        spotify={profile.spotify}
        youtube={profile.youtube_url}
      />

      {/* Collection */}
      <div className="border-t border-white/5 pt-3">
        {loadingContacts ? (
          <p className="text-xs text-zinc-600">Cargando red...</p>
        ) : (
          <NetworkCollection contacts={contacts} />
        )}
      </div>
    </div>
  );
}
