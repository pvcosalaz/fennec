"use client";

// /admin — Fennec CRM. Registered-user metrics: who they are, how they
// explore the app (navigation history), activity and churn signals.
// Access requires profiles.is_admin (migration 20260610_user_events).

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Overview = {
  eventsReady: boolean;
  totalUsers: number;
  proUsers: number;
  bots: number;
  newUsers7d: number;
  active24h: number;
  active7d: number;
  signupsByDay: { day: string; count: number }[];
  moduleUsage: { tab: string; count: number }[];
};

type CrmUser = {
  id: string;
  username: string;
  display_name: string | null;
  role: string | null;
  country: string | null;
  is_pro: boolean;
  fennec_db_score: number;
  created_at: string;
  ig_followers: number | null;
  tiktok_followers: number | null;
  yt_subscribers: number | null;
  last_active: string | null;
};

type UserEvent = { type: string; meta: { tab?: string } | null; created_at: string };

const TAB_LABELS: Record<string, string> = {
  dashboard: "Home",
  pricing: "Business Hub",
  contenido: "Content Lab",
  ideas: "Audio / Reviews",
  noticias: "Community",
};

const EVENT_LABELS: Record<string, string> = {
  session_start: "Opened the app",
  module_view: "Viewed",
  settings_open: "Opened settings",
  sign_out: "Signed out",
};

const DAY = 24 * 60 * 60 * 1000;

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / DAY)}d ago`;
}

function fmt(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function AdminPage() {
  const [state, setState] = useState<"loading" | "signedout" | "forbidden" | "error" | "ready">("loading");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Record<string, UserEvent[]>>({});

  async function load() {
    setState("loading");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setState("signedout"); return; }
    const headers = { Authorization: `Bearer ${session.access_token}` };
    try {
      const [ovRes, usRes] = await Promise.all([
        fetch("/api/admin/overview", { headers }),
        fetch("/api/admin/users", { headers }),
      ]);
      if (ovRes.status === 401) { setState("signedout"); return; }
      if (ovRes.status === 403) { setState("forbidden"); return; }
      if (!ovRes.ok || !usRes.ok) { setState("error"); return; }
      setOverview(await ovRes.json() as Overview);
      setUsers(((await usRes.json()) as { users: CrmUser[] }).users);
      setState("ready");
    } catch {
      setState("error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function toggleUser(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!timeline[id]) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/admin/user-events?userId=${id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const { events } = await res.json() as { events: UserEvent[] };
        setTimeline((t) => ({ ...t, [id]: events }));
      }
    }
  }

  const maxSignups = Math.max(1, ...(overview?.signupsByDay.map((d) => d.count) ?? [1]));
  const maxModule  = Math.max(1, ...(overview?.moduleUsage.map((m) => m.count) ?? [1]));

  return (
    // h-[100dvh] + overflow-y-auto: /admin owns its own scroll. The global app
    // shell locks html/body to overflow:hidden for the PWA, so a plain
    // min-h-screen page gets clipped and can't scroll past the viewport.
    <div className="h-[100dvh] overflow-y-auto overscroll-none bg-[#0a0a0b] text-zinc-100 px-5 py-8 md:px-10">
      <style>{`.mono{font-family:ui-monospace,Menlo,monospace}`}</style>

      {/* header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between mb-10">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black tracking-tight">fennec</span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#f5a623] shadow-[0_0_8px_rgba(245,166,35,.8)]" />
          <span className="mono ml-3 text-[11px] uppercase tracking-[0.3em] text-zinc-500">CRM</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => void load()}
            className="mono rounded-lg border border-white/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-zinc-400 hover:border-[#f5a623]/40 hover:text-white transition">
            Refresh
          </button>
          <a href="/" className="mono rounded-lg bg-[#f5a623] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-black">
            Back to app
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl">
        {state === "loading" && <p className="mono text-sm text-zinc-500">Loading…</p>}

        {state === "signedout" && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 max-w-lg">
            <h2 className="text-lg font-bold mb-2">Sign in first</h2>
            <p className="text-sm text-zinc-400 mb-4">The CRM uses your Fennec session. Open the app, sign in, then come back to /admin.</p>
            <a href="/" className="mono text-[12px] text-[#f5a623]">Go to the app →</a>
          </div>
        )}

        {state === "forbidden" && (
          <div className="rounded-2xl border border-[#f5a623]/30 bg-[#f5a623]/[0.04] p-8 max-w-2xl">
            <h2 className="text-lg font-bold mb-2">Setup required</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Your account isn&apos;t flagged as admin yet — or the migration hasn&apos;t run.
              In Supabase → SQL Editor, run <span className="mono text-[#f5a623]">supabase/migrations/20260610_user_events.sql</span>.
              It creates the <span className="mono">user_events</span> table and sets <span className="mono">is_admin = true</span> for @pvcosalaz.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-8 max-w-lg">
            <h2 className="text-lg font-bold mb-2">Something broke</h2>
            <p className="text-sm text-zinc-400">Couldn&apos;t load CRM data. Check the Vercel logs for /api/admin/*.</p>
          </div>
        )}

        {state === "ready" && overview && (
          <>
            {!overview.eventsReady && (
              <div className="mb-8 rounded-xl border border-[#f5a623]/30 bg-[#f5a623]/[0.05] px-5 py-3">
                <p className="mono text-[12px] text-[#f5a623]">
                  Activity tracking is off — run supabase/migrations/20260610_user_events.sql to enable navigation history, active users and module usage.
                </p>
              </div>
            )}

            {/* stat cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-10">
              {[
                { label: "Users", value: overview.totalUsers },
                { label: "Pro", value: overview.proUsers },
                { label: "New · 7d", value: overview.newUsers7d },
                { label: "Active · 7d", value: overview.eventsReady ? overview.active7d : "—" },
                { label: "Active · 24h", value: overview.eventsReady ? overview.active24h : "—" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4">
                  <p className="text-3xl font-black tabular-nums">{s.value}</p>
                  <p className="mono mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-2 mb-12">
              {/* signups 14d */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <p className="mono mb-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500">Signups · last 14 days</p>
                <div className="flex h-24 items-end gap-1.5">
                  {overview.signupsByDay.map((d) => (
                    <div key={d.day} className="flex-1" title={`${d.day}: ${d.count}`}>
                      <div className="w-full rounded-t bg-[#f5a623]"
                        style={{ height: `${(d.count / maxSignups) * 88 + 4}px`, opacity: d.count ? 0.95 : 0.12 }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* module usage */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
                <p className="mono mb-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500">Module usage · 30 days</p>
                {overview.moduleUsage.length === 0 && (
                  <p className="mono text-[11px] text-zinc-600">No navigation events yet.</p>
                )}
                <div className="space-y-2.5">
                  {overview.moduleUsage.map((m) => (
                    <div key={m.tab} className="flex items-center gap-3">
                      <span className="mono w-28 shrink-0 text-[11px] text-zinc-400">{TAB_LABELS[m.tab] ?? m.tab}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                        <div className="h-full rounded-full bg-[#f5a623] shadow-[0_0_8px_rgba(245,166,35,.4)]"
                          style={{ width: `${(m.count / maxModule) * 100}%` }} />
                      </div>
                      <span className="mono w-10 text-right text-[11px] tabular-nums text-zinc-500">{m.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* users table */}
            <p className="mono mb-4 text-[10px] uppercase tracking-[0.25em] text-zinc-500">
              Registered users · click a row for their activity
            </p>
            <div className="overflow-hidden rounded-2xl border border-white/[0.07]">
              <div className="mono hidden grid-cols-[1.4fr_1fr_.5fr_.5fr_.7fr_.7fr] gap-3 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3 text-[10px] uppercase tracking-[0.15em] text-zinc-500 md:grid">
                <span>User</span><span>Role · Country</span><span>dB</span><span>Plan</span><span>Joined</span><span>Last active</span>
              </div>
              {users.map((u) => {
                const inactive = u.last_active != null && Date.now() - new Date(u.last_active).getTime() > 14 * DAY;
                return (
                  <div key={u.id} className="border-b border-white/[0.04] last:border-0">
                    <button onClick={() => void toggleUser(u.id)}
                      className="grid w-full grid-cols-2 gap-2 px-5 py-3.5 text-left transition hover:bg-white/[0.02] md:grid-cols-[1.4fr_1fr_.5fr_.5fr_.7fr_.7fr] md:gap-3 md:items-center">
                      <span>
                        <span className="font-semibold">@{u.username}</span>
                        {u.display_name && <span className="ml-2 text-[12px] text-zinc-500">{u.display_name}</span>}
                      </span>
                      <span className="mono text-[11px] text-zinc-400">{u.role ?? "—"} · {u.country ?? "—"}</span>
                      <span className="mono text-[12px] tabular-nums text-[#f5a623]">{u.fennec_db_score}</span>
                      <span>
                        {u.is_pro
                          ? <span className="mono rounded-full bg-[#f5a623] px-2 py-0.5 text-[9px] font-bold text-black">PRO</span>
                          : <span className="mono text-[10px] text-zinc-600">free</span>}
                      </span>
                      <span className="mono text-[11px] text-zinc-500">{new Date(u.created_at).toLocaleDateString()}</span>
                      <span className="mono text-[11px]" style={{ color: inactive ? "#f5a623" : "#71717a" }}>
                        {timeAgo(u.last_active)}{inactive && " ⚠"}
                      </span>
                    </button>
                    {expanded === u.id && (
                      <div className="border-t border-white/[0.04] bg-black/30 px-5 py-4">
                        <p className="mono mb-3 text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                          Social: IG {fmt(u.ig_followers)} · TikTok {fmt(u.tiktok_followers)} · YT {fmt(u.yt_subscribers)}
                        </p>
                        {!timeline[u.id] && <p className="mono text-[11px] text-zinc-600">Loading timeline…</p>}
                        {timeline[u.id]?.length === 0 && <p className="mono text-[11px] text-zinc-600">No events yet.</p>}
                        <div className="space-y-1.5">
                          {timeline[u.id]?.map((e, i) => (
                            <div key={i} className="mono flex items-center gap-3 text-[11px]">
                              <span className="text-zinc-600 w-16 shrink-0">{timeAgo(e.created_at)}</span>
                              <span className="h-1 w-1 rounded-full bg-[#f5a623]" />
                              <span className="text-zinc-300">
                                {EVENT_LABELS[e.type] ?? e.type}
                                {e.type === "module_view" && e.meta?.tab && ` ${TAB_LABELS[e.meta.tab] ?? e.meta.tab}`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
