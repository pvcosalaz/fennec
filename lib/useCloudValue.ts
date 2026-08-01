"use client";
import { useEffect, useRef } from "react";
import { pullUserState, pushUserState, subscribeUserState } from "@/lib/userState";

/* ═══════════════════════════════════════════════════════════════
   Cloud sync for a SINGLE localStorage value (an object or scalar),
   the sibling of useCloudArray which only handles arrays of {id}.

   Built because the pricing setup — expenses, monthly target, the
   minimum rate every quote is checked against — lived only in
   localStorage. Paco set his up on his phone, opened Business on
   the desktop, and got "Set up your pricing first" on a quote he
   was mid-way through (2026-08-01). Setup is per ACCOUNT, not per
   device, and certainly not per quote.

   Last-write-wins, same as useCloudArray: a single user editing
   their own settings on two devices doesn't need CRDTs.
   ═══════════════════════════════════════════════════════════════ */

/** How long after a local edit we refuse remote writes. Long enough to cover
 *  a realtime round trip, short enough that a genuine edit from another device
 *  lands almost immediately once you stop typing. */
const LOCAL_EDIT_GUARD_MS = 2500;
/** Typing shouldn't hit the network on every keystroke. */
const PUSH_DEBOUNCE_MS = 700;

export function useCloudValue<T>(
  key: string,
  value: T | null,
  setValue: (next: T) => void,
): void {
  const ready = useRef(false);          // first hydrate finished
  const applyingRemote = useRef(false); // suppress the echo push
  const lastPushed = useRef<string>("");
  const lastLocalEdit = useRef(0);      // timestamp of the last local change
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── hydrate from the cloud once, then subscribe ──
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const remote = await pullUserState<T>(key);
      if (cancelled) return;
      if (remote != null) {
        applyingRemote.current = true;
        setValue(remote);
        lastPushed.current = JSON.stringify(remote);
      }
      ready.current = true;
    })();

    const unsub = subscribeUserState(key, (incoming) => {
      if (incoming == null) return;
      const serialized = JSON.stringify(incoming);
      // Ignore the echo of our own write.
      if (serialized === lastPushed.current) return;
      // While the user is typing, THEY win. Echoes of earlier keystrokes
      // arrive after later ones, and applying them rewinds the field —
      // literally eating digits mid-entry (Paco 2026-08-01, my regression
      // from shipping this sync).
      if (Date.now() - lastLocalEdit.current < LOCAL_EDIT_GUARD_MS) return;
      applyingRemote.current = true;
      setValue(incoming as T);
      lastPushed.current = serialized;
    });

    return () => { cancelled = true; unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // ── push local edits (debounced) ──
  useEffect(() => {
    if (!ready.current) return;           // don't push the pre-hydrate default
    if (applyingRemote.current) { applyingRemote.current = false; return; }
    if (value == null) return;

    const serialized = JSON.stringify(value);
    if (serialized === lastPushed.current) return;

    lastLocalEdit.current = Date.now();
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      lastPushed.current = serialized;
      void pushUserState(key, value);
    }, PUSH_DEBOUNCE_MS);

    return () => { if (pushTimer.current) clearTimeout(pushTimer.current); };
  }, [key, value]);
}
