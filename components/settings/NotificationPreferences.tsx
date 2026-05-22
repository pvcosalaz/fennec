"use client";
import { useEffect, useState } from "react";
import { Mic, Calendar, Clock, Newspaper, ArrowLeft } from "lucide-react";
import type { NotificationPreferences } from "@/lib/notificationDb";
import { fetchPreferences, upsertPreferences } from "@/lib/notificationDb";

type Props = {
  userId: string;
  onBack: () => void;
};

type ToggleRow = {
  key: keyof Omit<NotificationPreferences, "user_id">;
  label: string;
  description: string;
  icon: React.ElementType;
};

const ROWS: ToggleRow[] = [
  {
    key: "audio_feedback",
    label: "Audio feedback",
    description: "When someone comments on your track",
    icon: Mic,
  },
  {
    key: "content_scheduled",
    label: "Content reminders",
    description: "Day-of reminders for scheduled posts",
    icon: Calendar,
  },
  {
    key: "project_deadline",
    label: "Project deadlines",
    description: "24h before a project is due",
    icon: Clock,
  },
  {
    key: "industry_news",
    label: "Industry news",
    description: "When new music industry news drops",
    icon: Newspaper,
  },
];

export default function NotificationPreferences({ userId, onBack }: Props) {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences(userId).then(setPrefs).catch(console.error);
  }, [userId]);

  async function toggle(key: keyof Omit<NotificationPreferences, "user_id">) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    try {
      await upsertPreferences(updated);
    } catch (err) {
      console.error(err);
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full px-4 pt-2 pb-8">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      <h2 className="text-sm font-bold text-white mb-4">Notification Preferences</h2>

      {!prefs ? (
        <p className="text-xs text-zinc-600 py-8 text-center">Loading...</p>
      ) : (
        <div className="space-y-1">
          {ROWS.map((row) => {
            const Icon = row.icon;
            const enabled = prefs[row.key];
            return (
              <button
                key={row.key}
                onClick={() => toggle(row.key)}
                disabled={saving}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition text-left"
              >
                <div className={`shrink-0 ${enabled ? "text-amber-500" : "text-zinc-600"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{row.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{row.description}</p>
                </div>
                <div
                  className={`shrink-0 w-10 h-6 rounded-full transition-colors ${
                    enabled ? "bg-amber-500" : "bg-white/10"
                  } flex items-center px-1`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enabled ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
