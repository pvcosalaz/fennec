"use client";

import { useState, useEffect } from "react";
import ComingSoon from "@/components/ComingSoon";

/* Wraps the app root while NEXT_PUBLIC_COMING_SOON === "true": the public sees
   the ComingSoon curtain, so no one can reach the login or use the unlaunched
   app. Visiting once with ?acceso=<PREVIEW_CODE> stores a bypass flag on that
   device, so Paco and testers keep full access. /join and /api routes aren't
   wrapped, so the waitlist keeps working. This is a soft curtain (the check is
   client-side), not hardened auth — enough to keep the pre-launch closed. */

const ENABLED = process.env.NEXT_PUBLIC_COMING_SOON === "true";
const PREVIEW_CODE = "zorro-vip-2026";
const BYPASS_KEY = "fennec-preview";

export default function ComingSoonGate({ children }: { children: React.ReactNode }) {
  const [bypassed, setBypassed] = useState(false);

  useEffect(() => {
    if (!ENABLED) return;
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("acceso");
      if (code === PREVIEW_CODE) {
        localStorage.setItem(BYPASS_KEY, "1");
        url.searchParams.delete("acceso");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }
      if (localStorage.getItem(BYPASS_KEY) === "1") setBypassed(true);
    } catch { /* ignore */ }
  }, []);

  if (!ENABLED || bypassed) return <>{children}</>;
  return <ComingSoon />;
}
