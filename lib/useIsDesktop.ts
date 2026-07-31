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

/** True when the desktop sidebar should collapse to icons only. */
export function useSidebarCompact(): boolean {
  return useMediaQuery(SIDEBAR_COMPACT_QUERY);
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
