"use client";

/* Dev-only, 404s in production.

   The real DesktopShell with a mocked profile. Everything about the shell —
   surfaces, rails, the collapse toggle — was previously only checkable by
   logging in, which meant shipping shell changes on faith. Now it isn't.

   Network and notification calls run against the fake user id and come back
   empty, which is the point: the chrome is what's under test, not the data. */

import { useState } from "react";
import { notFound } from "next/navigation";
import DesktopShell, { type DesktopTab } from "@/components/desktop/DesktopShell";
import DashboardDesktop from "@/components/desktop/DashboardDesktop";
import ScriptWriterOverlay from "@/components/content/ScriptWriterOverlay";
import ContentModule from "@/components/content/ContentModule";
import SettingsModule from "@/components/settings/SettingsModule";
import type { Profile, Post } from "@/lib/communityTypes";
import { dayKey, type ContributionDays } from "@/lib/contributions";
import { getColorScheme } from "@/lib/fennecIdPalette";

const mockProfile: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "pacosalaz", avatar_url: null, is_pro: true, is_bot: false,
  fennec_db_score: 65, created_at: new Date().toISOString(), bio: null, genres: [],
  worked_with: null, worked_in: null, banner_url: null, studio_photo_url: null, studio_photo_luma: null, display_name: "Paco Salaz",
  role: "Composer", country: "Mexico", instagram: null, spotify: null,
  youtube_url: null, tiktok: null, color_id: null,
};

/** Sparse on purpose: Paco's real dashboard has a handful of contributions,
 *  and a full heatmap would hide the layout problem instead of showing it. */
const mockContributions: ContributionDays = (() => {
  const byDay = new Map<string, number>();
  const detail = new Map<string, Record<string, number>>();
  const kinds = ["quote", "project", "track", "feedback", "post", "client"] as const;
  [3, 9, 14, 27, 41, 58, 96, 120].forEach((back, i) => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    const n = (i % 3) + 1;
    byDay.set(dayKey(d), n);
    detail.set(dayKey(d), { [kinds[i % kinds.length]]: n });
  });
  return { byDay, detail, total: 8, totalYear: 8, streak: 2 } as ContributionDays;
})();

const post = (
  id: string, name: string, username: string, mins: number,
  content: string, vibes: number, replies: number,
): Post => ({
  id, user_id: id, content, category: "sync", media_url: null, media_type: null,
  media_name: null, link_url: null, link_title: null, repost_of: null,
  created_at: new Date(Date.now() - mins * 60_000).toISOString(),
  profile: { ...mockProfile, id, username, display_name: name, avatar_url: null },
  vibe_count: vibes, comment_count: replies, user_vibed: false, user_bookmarked: false,
});

const mockPosts: Post[] = [
  post("m1", "Ileana Vergara", "ileana.strings", 18,
    "Client asked for 'tension without percussion' on a doc series. Ended up bowing a bass guitar through a granular delay. Sometimes the brief IS the idea.", 14, 6),
  post("m2", "Tobias Ferrand", "tferrand", 96,
    "Reminder that a 3-second silence before the drop does more than any riser you can buy.", 31, 4),
  post("m3", "Renata Alcaraz", "renata.mixes", 340,
    "Anyone here quoting agencies in EUR from LATAM? Trying to figure out whether to eat the conversion or build it into the rate.", 9, 12),
  post("m4", "Kwabena Osei", "kwabena.o", 1180,
    "Finished a 40-cue package in six weeks. The thing that saved me wasn't a plugin, it was writing the deliverables list before touching the DAW.", 22, 3),
];

const mockRef = {
  title: "Faraway - What Is Love (Live Loop Cover) | Minilab 3 #ableton #synthmusic",
  channel: "B-roll with voiceover",
  angle: "Demonstrate how to transform a recognizable theme or film score snippet using Ableton's tools to show how remixing underscore or creating variations helps maintain continuity across TV episodes.",
  why: "", url: "", thumbnail: "",
};

export default function ShellDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const [tab, setTab] = useState<DesktopTab>("dashboard");
  // ?tool=script monta el escritor de guiones DENTRO del shell, que es la única
  // forma de comprobar que ya no se mete debajo de la barra lateral ni choca
  // con el avatar pegado al borde derecho.
  const params = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search) : null;
  const tool = params?.get("tool");
  /* ?photo=<url>&luma=<0..1> para ver el dashboard con foto de estudio sin
     tener que subir una. Va por parametro y no como asset del repo para no
     mandar JPEGs de prueba a produccion. */
  const photo = params?.get("photo") ?? null;
  const photoLuma = Number(params?.get("luma") ?? "0.5");

  return (
    <DesktopShell
      profile={mockProfile}
      userId={mockProfile.id}
      activeTab={tab}
      onNavigate={setTab}
      onOpenNetwork={() => {}}
      onOpenSettings={() => {}}
    >
      {tool === "settings" ? (
        <SettingsModule
          onBack={() => {}}
          language="en"
          onLanguageChange={() => {}}
          avatarUrl={null}
          onAvatarChange={() => {}}
          onSignOut={() => {}}
          userId={mockProfile.id}
          initialSection="profile"
        />
      ) : tool === "content" ? (
        <ContentModule isPro genres={[]} userId={mockProfile.id} onUpgrade={() => {}} />
      ) : tool === "script" ? (
        <ScriptWriterOverlay isDesktop videoRef={mockRef} onSave={() => {}} onClose={() => {}} />
      ) : (
      <DashboardDesktop
        card={{
          firstName: "Paco", lastName: "Salaz", role: "Composer", country: "Mexico",
          genres: ["Cinematic", "Film/TV"], initials: "PS", avatarUrl: null,
          collectionNumber: 1,
        }}
        networkProfile={mockProfile}
        studioPhotoUrl={photo}
        studioPhotoLuma={photoLuma}
        userId={mockProfile.id}
        fennecDb={65}
        cardColorScheme={getColorScheme(null)}
        igFollowers={37000}
        ttFollowers={83300}
        ytSubs={4800}
        activeProjects={0}
        totalProjects={0}
        quotesSentCount={2}
        quotesOutTotal={139432}
        karma={5}
        sentQuotes={[]}
        latestNote={null}
        contributions={mockContributions}
        communityPosts={mockPosts}
      />
      )}
    </DesktopShell>
  );
}
