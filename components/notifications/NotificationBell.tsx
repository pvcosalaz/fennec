"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Bell } from "lucide-react";
import { countUnread } from "@/lib/notificationDb";
import NotificationSheet from "./NotificationSheet";

type Props = {
  userId: string;
  align?: "left" | "right";
};

export default function NotificationBell({ userId, align = "left" }: Props) {
  const [unread, setUnread]         = useState(0);
  const [open, setOpen]             = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  // Screen coords of the bell, handed to the panel so it can render in a
  // portal. The desktop rail both clips (overflow-y:auto) and traps
  // (transform) its descendants, so an in-place dropdown gets cut off there
  // no matter its z-index (Paco 2026-07-30).
  const [anchor, setAnchor] = useState<{ top: number; left: number; right: number } | null>(null);

  function toggle() {
    setOpen((o) => {
      const next = !o;
      if (next && btnRef.current) {
        const r = btnRef.current.getBoundingClientRect();
        setAnchor({ top: r.bottom, left: r.left, right: window.innerWidth - r.right });
      }
      return next;
    });
  }

  // Keep the panel glued to the bell while the window moves under it.
  useEffect(() => {
    if (!open) return;
    const sync = () => {
      if (!btnRef.current) return;
      const r = btnRef.current.getBoundingClientRect();
      setAnchor({ top: r.bottom, left: r.left, right: window.innerWidth - r.right });
    };
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open]);

  const refreshCount = useCallback(() => {
    countUnread(userId).then(setUnread).catch(console.error);
  }, [userId]);

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    return () => clearInterval(interval);
  }, [refreshCount]);

  useEffect(() => {
    if (subscribed || typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });
        }

        const { endpoint, keys } = sub.toJSON() as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };

        const { data: { session } } = await import("@/lib/supabase").then(
          (m) => m.supabase.auth.getSession()
        );

        if (session?.access_token) {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ endpoint, keys }),
          });
          setSubscribed(true);
        }
      } catch (err) {
        console.error("[push register]", err);
      }
    })();
  }, [subscribed]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={toggle}
        className="relative flex items-center justify-center h-8 w-8 rounded-xl border border-white/10 bg-white/5 text-zinc-400 hover:text-accent hover:border-accent/30 transition"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-black text-[9px] font-bold flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <NotificationSheet
          align={align}
          anchor={anchor}
          ignoreRef={btnRef}
          userId={userId}
          onClose={() => setOpen(false)}
          onRead={refreshCount}
        />
      )}
    </div>
  );
}
