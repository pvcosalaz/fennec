"use client";
import { useEffect, useRef } from "react";
import { pullUserState, pushUserState, subscribeUserState } from "./userState";

/**
 * Cloud-sync an array-of-objects state (each item keyed by `id`) that already
 * lives in localStorage — without rewriting the caller's useState or its many
 * setX callers. Drop it in next to the existing state:
 *
 *   const [briefs, setBriefs] = useState<Brief[]>([]);
 *   useCloudArray(BRIEFS_KEY, briefs, setBriefs);
 *
 * Behavior:
 * - First sync MERGES local + cloud by id, so nothing a device made offline is
 *   lost, and pushes the merged set back so both sides converge.
 * - After that, local edits push (debounced) and remote edits arrive live via
 *   Supabase realtime (cloud value replaces — last write wins).
 * - The caller keeps its own localStorage persistence; this only adds cloud.
 */
export function useCloudArray<T extends { id: string }>(
  key: string,
  value: T[],
  setValue: (updater: (prev: T[]) => T[]) => void,
): void {
  const ready = useRef(false);          // first hydrate finished
  const applyingRemote = useRef(false); // suppress push for cloud-originated changes
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timestamp of the last local edit. While someone is typing (a script
   *  title, an idea name), a late echo of an earlier keystroke would rewind
   *  the field under them — the digit-eating bug this hook's sibling hit
   *  (Paco 2026-08-01). Local edits win for a beat. */
  const lastLocalEdit = useRef(0);
  const LOCAL_EDIT_GUARD_MS = 2500;
  const latest = useRef(value);
  latest.current = value;

  useEffect(() => {
    let alive = true;
    const mergeById = (a: T[], b: T[]): T[] => {
      const m = new Map<string, T>();
      for (const it of a) m.set(it.id, it);
      for (const it of b) m.set(it.id, it); // b (cloud/remote) wins on conflict
      return Array.from(m.values());
    };

    void pullUserState<T[]>(key).then((cloud) => {
      if (!alive) return;
      if (Array.isArray(cloud) && cloud.length > 0) {
        applyingRemote.current = true;
        setValue((local) => {
          const merged = mergeById(local, cloud);
          void pushUserState(key, merged); // propagate any local-only items
          return merged;
        });
      } else if (latest.current.length > 0) {
        // Cloud empty: seed it from whatever this device already has.
        void pushUserState(key, latest.current);
      }
      ready.current = true;
    });

    const unsub = subscribeUserState(key, (remote) => {
      if (!Array.isArray(remote)) return;
      if (Date.now() - lastLocalEdit.current < LOCAL_EDIT_GUARD_MS) return;
      applyingRemote.current = true;
      setValue(() => remote as T[]);
    });

    return () => { alive = false; unsub(); };
  }, [key, setValue]);

  // Push local edits (debounced), skipping changes that came from the cloud.
  useEffect(() => {
    if (!ready.current) return;
    if (applyingRemote.current) { applyingRemote.current = false; return; }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    lastLocalEdit.current = Date.now();
    pushTimer.current = setTimeout(() => { void pushUserState(key, latest.current); }, 700);
  }, [value, key]);
}
