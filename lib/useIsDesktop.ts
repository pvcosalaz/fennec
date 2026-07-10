"use client";
import { useEffect, useState } from "react";

/** The one breakpoint that decides which shell renders. 1024px keeps
 *  portrait tablets on the touch UI; only real desktop widths get the
 *  sidebar shell. See docs/superpowers/specs/2026-07-09-desktop-foundation. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** SSR-safe: returns false on the server and on the first client render,
 *  then tracks the media query live. The mobile shell is the default so
 *  the launch app can never regress because of this hook. */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}
