"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, Mic, Calendar, Clock, Newspaper, X, CheckCheck } from "lucide-react";
import type { Notification, NotificationType } from "@/lib/notificationDb";
import { fetchNotifications, markAllRead, markOneRead } from "@/lib/notificationDb";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  audio_feedback: Mic,
  content_scheduled: Calendar,
  project_deadline: Clock,
  industry_news: Newspaper,
};

type Props = {
  userId: string;
  onClose: () => void;
  onRead: () => void;
};

export default function NotificationSheet({ userId, onClose, onRead }: Props) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications(userId)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  async function handleMarkAll() {
    await markAllRead(userId);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onRead();
  }

  async function handleTap(notification: Notification) {
    if (!notification.read) {
      await markOneRead(notification.id);
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n))
      );
      onRead();
    }
  }

  const unreadCount = items.filter((n) => !n.read).length;

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-2 w-80 z-50 rounded-2xl bg-[#1a1a1e] border border-white/10 shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-white/8">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-bold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs bg-amber-500 text-black font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto px-2 py-2 space-y-1">
        {loading && (
          <p className="text-xs text-zinc-600 text-center py-8">Loading...</p>
        )}
        {!loading && items.length === 0 && (
          <p className="text-xs text-zinc-600 text-center py-8">No notifications yet.</p>
        )}
        {items.map((n) => {
          const Icon = TYPE_ICONS[n.type];
          return (
            <button
              key={n.id}
              onClick={() => handleTap(n)}
              className={`w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition ${
                n.read ? "bg-transparent" : "bg-amber-500/5 border border-amber-500/10"
              } hover:bg-white/5`}
            >
              <div className={`mt-0.5 shrink-0 ${n.read ? "text-zinc-600" : "text-amber-500"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm leading-snug ${n.read ? "text-zinc-400" : "text-white"}`}>
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs text-zinc-600 mt-0.5 truncate">{n.body}</p>
                )}
              </div>
              <span className="text-[10px] text-zinc-600 shrink-0 mt-0.5">
                {relativeTime(n.created_at)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
