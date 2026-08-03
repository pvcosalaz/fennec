"use client";

// Visual QA page — renders the Dashboard with mock data, no auth needed.
// Not linked anywhere; used to iterate on dashboard design.

import { notFound } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import type { Profile } from "@/lib/communityTypes";

const mockProfile: Profile = {
  id: "00000000-0000-0000-0000-000000000000",
  username: "pvcosalaz",
  avatar_url: null,
  is_pro: false,
  is_bot: false,
  fennec_db_score: 1627,
  created_at: new Date().toISOString(),
  bio: null,
  genres: ["Cinematic"],
  worked_with: null,
  worked_in: null,
  banner_url: null, studio_photo_url: null, studio_photo_luma: null,
  display_name: "Paco Salaz",
  role: "Composer",
  country: "Mexico",
  instagram: "pvcosalaz",
  spotify: "Paco Salaz",
  youtube_url: "pacosalaz",
  tiktok: "pvcosalaz",
  color_id: "red",
  ig_followers: 36262,
  tiktok_followers: 79300,
  yt_subscribers: 4730,
  social_synced_at: new Date().toISOString(),
};

export default function DashboardDemo() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="min-h-screen overflow-y-auto py-6" style={{ background: "#111114" }}>
      <Dashboard
        username="pvcosalaz"
        userId={null}
        networkProfile={mockProfile}
        avatarUrl={null}
      />
    </main>
  );
}
