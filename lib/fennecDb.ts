// Fennec dB — a producer's "signal strength" on a logarithmic (decibel) scale.
//
// Reach is the engine: it's your real audience (social followers, and later
// verified streams/credits) run through a log10 curve, so every 10x of
// audience is roughly +12 dB. That rewards growth at every level — going 1k→2k
// feels the same as 100k→200k — and no mega-account can blow out the scale.
//
// Activity (projects, clients, quotes) is a small, capped booster ON TOP of
// reach. Closing work never lowers your number. A new producer raises their dB
// by connecting real accounts, not by grinding fake projects in the app.
//
// This is the ONE source of truth for the score. Both the dashboard (which
// recomputes + persists it) and any server-side reader should use it.

export type FennecDbInputs = {
  // ── Reach (the engine) ──
  spotifyFollowers?: number | null;
  instagramFollowers?: number | null;
  tiktokFollowers?: number | null;
  youtubeSubscribers?: number | null;
  /** Reserved: verified streams/credits (Muso.AI) — folds into reach later. */
  verifiedCredits?: number | null;

  // ── Activity (a small, capped booster) ──
  activeProjects?: number | null;
  closedProjects?: number | null;
  clients?: number | null;
  quotesSent?: number | null;
};

/** +12 dB per 10x of audience: 100→24, 1k→36, 10k→48, 100k→60, 1M→72. */
const REACH_PER_DECADE = 12;
/** Activity can add at most this much on top of reach — it's the topping, not the engine. */
const ACTIVITY_CAP = 8;

const n = (v: number | null | undefined) => (v && v > 0 ? v : 0);

export function totalReachAudience(i: FennecDbInputs): number {
  return (
    n(i.spotifyFollowers) +
    n(i.instagramFollowers) +
    n(i.tiktokFollowers) +
    n(i.youtubeSubscribers) +
    n(i.verifiedCredits)
  );
}

/** Reach component of the dB (before activity). */
export function reachDb(i: FennecDbInputs): number {
  const audience = totalReachAudience(i);
  return audience > 0 ? REACH_PER_DECADE * Math.log10(audience + 1) : 0;
}

/** Activity booster (0..ACTIVITY_CAP). Closed work is worth MORE than active,
 *  so finishing a project raises the number instead of dropping it. */
export function activityDb(i: FennecDbInputs): number {
  const raw =
    n(i.activeProjects) * 1.5 +
    n(i.closedProjects) * 3 +
    n(i.clients) * 1 +
    n(i.quotesSent) * 0.5;
  return Math.min(ACTIVITY_CAP, raw);
}

export function computeFennecDb(i: FennecDbInputs): number {
  return Math.round(reachDb(i) + activityDb(i));
}

export const FENNEC_DB_MODEL = {
  reachPerDecade: REACH_PER_DECADE,
  activityCap: ACTIVITY_CAP,
} as const;
