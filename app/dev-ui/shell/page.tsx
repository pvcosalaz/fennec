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
import { Tile, Cols, Col, Instrument, RiseStyle } from "@/components/desktop/ui";
import type { Profile } from "@/lib/communityTypes";

const mockProfile: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "pacosalaz", avatar_url: null, is_pro: true, is_bot: false,
  fennec_db_score: 65, created_at: new Date().toISOString(), bio: null, genres: [],
  worked_with: null, worked_in: null, banner_url: null, display_name: "Paco Salaz",
  role: "Composer", country: "Mexico", instagram: null, spotify: null,
  youtube_url: null, tiktok: null, color_id: null,
};

export default function ShellDevPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const [tab, setTab] = useState<DesktopTab>("pricing");

  return (
    <DesktopShell
      profile={mockProfile}
      userId={mockProfile.id}
      activeTab={tab}
      onNavigate={setTab}
      onOpenNetwork={() => {}}
      onOpenSettings={() => {}}
    >
      <RiseStyle />
      <div className="flex flex-col gap-10">
        <h1 className="text-[21px] font-bold tracking-tight text-white">Business</h1>

        <div className="dd-rise grid items-stretch gap-4" style={{ gridTemplateColumns: ".85fr 1.35fr" }}>
          <Instrument label="Revenue · MTD · MXN" value="$63,800" size={64}
            footer={<span className="relative mt-2 block text-[10px] text-zinc-500">2 payments this month</span>} />
          <Tile label="Revenue · last 6 months">
            <div className="mt-3 flex h-[168px] items-end gap-2.5">
              {[8, 26, 18, 52, 38, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-[4px]"
                  style={{ height: `${h}%`, background: i === 5 ? "#f5a623" : "rgba(255,255,255,.08)" }} />
              ))}
            </div>
          </Tile>
        </div>

        <Tile label="Pipeline" className="py-1">
          <Cols>
            <Col value="$128,400" label="Awaiting reply" sub="2 quotes out" />
            <Col value="$130,632" label="In progress" sub="2 projects" />
            <Col value="$100,632" label="Owed to you" sub="1 without deposit" />
          </Cols>
        </Tile>
      </div>
    </DesktopShell>
  );
}
