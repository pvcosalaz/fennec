"use client";
import { useEffect, useState } from "react";

/** Which shell renders is a question about the DEVICE, not the window size.
 *  A Mac stays a Mac when you drag the window narrow: real desktop apps
 *  (Slack, Linear, VS Code) never turn into a phone app mid-resize, and
 *  Fennec shouldn't either (Paco 2026-07-30).
 *
 *  `pointer: fine` + `hover: hover` means a mouse or trackpad drives the
 *  primary pointer, which is exactly "this is a computer". Touch devices
 *  report `pointer: coarse` and no hover, so phones and bare tablets keep
 *  the touch UI no matter how wide they are.
 *
 *  The min-width floor is the one concession: below it the sidebar leaves
 *  too little room for content, so a hard-squeezed window falls back to the
 *  touch shell instead of rendering something broken. */
export const DESKTOP_QUERY =
  "(pointer: fine) and (hover: hover) and (min-width: 560px)";

/** Below this the sidebar drops its labels and goes icon-only, so narrow
 *  windows keep the desktop shell instead of flipping to the phone UI. */
export const SIDEBAR_COMPACT_QUERY = "(max-width: 900px)";

/** SSR-safe: returns false on the server and on the first client render,
 *  then tracks the media query live. The mobile shell is the default so
 *  the launch app can never regress because of this hook. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}

/** True when the WINDOW is too narrow for labels. Not a preference: below
 *  this width there simply isn't room, so the toggle can't override it. */
export function useSidebarCompact(): boolean {
  return useMediaQuery(SIDEBAR_COMPACT_QUERY);
}

const SIDEBAR_COLLAPSED_KEY = "fennec-sidebar-collapsed-v1";

/**
 * The producer's own choice: icons only, or icons with labels.
 *
 * Collapsed by DEFAULT, the way Supabase and Linear open (Paco 2026-08-02).
 * A rail that starts wide spends screen on words you already know by their
 * icon after the second session; a rail that starts narrow gives the canvas
 * the room and costs one click on the rare occasion you need to read.
 *
 * Persisted, because a preference you have to re-set every launch isn't one.
 * Starting from `true` also means the first paint matches the stored value
 * for anyone who never toggled, so there's no expand-then-collapse flash.
 */
export function useSidebarCollapsed(): [boolean, (v: boolean) => void] {
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored !== null) setCollapsed(stored === "1");
    } catch { /* private mode: keep the default */ }
  }, []);

  const update = (v: boolean) => {
    setCollapsed(v);
    try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, v ? "1" : "0"); } catch { /* ignore */ }
  };

  return [collapsed, update];
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);

  return matches;
}
