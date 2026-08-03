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
import type { Profile } from "@/lib/communityTypes";
import { dayKey, type ContributionDays } from "@/lib/contributions";
import { getColorScheme } from "@/lib/fennecIdPalette";

const mockProfile: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "pacosalaz", avatar_url: null, is_pro: true, is_bot: false,
  fennec_db_score: 65, created_at: new Date().toISOString(), bio: null, genres: [],
  worked_with: null, worked_in: null, banner_url: null, display_name: "Paco Salaz",
  role: "Composer", country: "Mexico", instagram: null, spotify: null,
  youtube_url: null, tiktok: null, color_id: null,
};

/** Sparse on purpose: Paco's real dashboard has a handful of contributions,
 *  and a full heatmap would hide the layout problem instead of showing it. */
const mockContributions: ContributionDays = (() => {
  const byDay = new Map<string, number>();
  [3, 9, 14, 27, 41, 58, 96, 120].forEach((back, i) => {
    const d = new Date();
    d.setDate(d.getDate() - back);
    byDay.set(dayKey(d), (i % 3) + 1);
  });
  return { byDay, total: 8, totalYear: 8, streak: 2 };
})();

export default function ShellDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const [tab, setTab] = useState<DesktopTab>("dashboard");

  return (
    <DesktopShell
      profile={mockProfile}
      userId={mockProfile.id}
      activeTab={tab}
      onNavigate={setTab}
      onOpenNetwork={() => {}}
      onOpenSettings={() => {}}
    >
      <DashboardDesktop
        card={{
          firstName: "Paco", lastName: "Salaz", role: "Composer", country: "Mexico",
          genres: ["Cinematic", "Film/TV"], initials: "PS", avatarUrl: null,
          collectionNumber: 1,
        }}
        networkProfile={mockProfile}
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
      />
    </DesktopShell>
  );
}
