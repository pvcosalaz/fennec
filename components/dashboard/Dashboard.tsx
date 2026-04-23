"use client";

import {
  BarChart2,
  Music2,
  Camera,
  Play,
  Calculator,
  ArrowRight,
  Wifi,
} from "lucide-react";

type ConnectionItem = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  description: string;
  status: "disconnected";
};

const connections: ConnectionItem[] = [
  {
    icon: Music2,
    name: "Spotify",
    description: "Track your streams and listener growth",
    status: "disconnected",
  },
  {
    icon: Camera,
    name: "Instagram",
    description: "Monitor followers, reach and post performance",
    status: "disconnected",
  },
  {
    icon: Play,
    name: "YouTube",
    description: "View subscribers, views and revenue",
    status: "disconnected",
  },
  {
    icon: BarChart2,
    name: "TikTok",
    description: "Measure video performance and audience",
    status: "disconnected",
  },
  {
    icon: Calculator,
    name: "Pricing Calculator",
    description: "See your minimum price and active projects",
    status: "disconnected",
  },
];

export default function Dashboard() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-8 px-2">

      {/* Header */}
      <div className="space-y-2">
        <p className="text-xs font-semibold tracking-[0.35em] text-accent uppercase">
          Fennec Dashboard
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Your business, at a glance.
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          The Dashboard is your command center. Once connected, you'll see your streams,
          social metrics, and business health — all in one place, updated automatically.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Wifi className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-white">How it works</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-black/30 p-4 space-y-1">
            <p className="text-accent font-bold text-lg">01</p>
            <p className="text-white text-sm font-medium">Connect your platforms</p>
            <p className="text-zinc-400 text-xs">Link Spotify, Instagram, YouTube and TikTok below.</p>
          </div>
          <div className="rounded-xl bg-black/30 p-4 space-y-1">
            <p className="text-accent font-bold text-lg">02</p>
            <p className="text-white text-sm font-medium">Complete your setup</p>
            <p className="text-zinc-400 text-xs">Finish your Pricing Calculator so your business metrics appear here.</p>
          </div>
          <div className="rounded-xl bg-black/30 p-4 space-y-1">
            <p className="text-accent font-bold text-lg">03</p>
            <p className="text-white text-sm font-medium">Get your overview</p>
            <p className="text-zinc-400 text-xs">Your AI agent will summarize your growth, wins and what to focus on.</p>
          </div>
        </div>
      </div>

      {/* Connections */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-widest">
          Connect your platforms
        </h2>
        <div className="space-y-2">
          {connections.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 transition hover:border-accent/40"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black/40">
                    <Icon className="h-5 w-5 text-zinc-300" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.name}</p>
                    <p className="text-xs text-zinc-400">{item.description}</p>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 rounded-xl border border-white/15 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-accent hover:text-accent">
                  Connect <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Coming soon note */}
      <p className="text-center text-xs text-zinc-600 pb-2">
        Platform integrations coming in the next update · Your data stays private
      </p>
    </div>
  );
}
