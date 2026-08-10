"use client";

/* ═══════════════════════════════════════════════════════════════
   COMMUNITY PULSE — what other producers are saying.

   The dashboard had ~640px of content in a 1250px window and the
   slack read as a hole. Paco picked community activity to fill it
   (2026-08-02), which is the right choice for a reason beyond
   geometry: every other block on this page is about YOU — your
   card, your dB, your money, your reach. A home screen made only
   of your own numbers has no reason to be revisited during the day.

   Deliberately NOT the notification bell's contents. Those are
   things that happened TO you and already live one click away in
   the rail; repeating them here would be the same feed twice.
   ═══════════════════════════════════════════════════════════════ */

import { useTranslation } from "react-i18next";
import i18nInstance from "@/lib/i18n";
import { Tile } from "@/components/desktop/ui";
import type { Post } from "@/lib/communityTypes";

/** "just now" / "12m" / "3h" / "2d" — the compact form a feed wants. */
function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return i18nInstance.t("nsAhora");
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function Avatar({ post }: { post: Post }) {
  const p = post.profile;
  const label = (p?.display_name || p?.username || "?").trim();
  const initials = label.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  if (p?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={p.avatar_url} alt="" className="h-8 w-8 flex-shrink-0 rounded-full object-cover" />;
  }
  return (
    <div className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-white/[0.06] text-[10.5px] font-bold text-zinc-400">
      {initials}
    </div>
  );
}

/** Skeleton rows matched to the real row height, so the card doesn't
 *  resize when data lands. A spinner would move the whole page. */
function Loading({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col divide-y divide-white/[0.05]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-3 first:pt-0">
          <div className="h-8 w-8 flex-shrink-0 animate-pulse rounded-full bg-white/[0.05]" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <div className="h-[9px] w-24 animate-pulse rounded bg-white/[0.05]" />
            <div className="h-[9px] animate-pulse rounded bg-white/[0.04]" style={{ width: `${72 - i * 9}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CommunityPulse({
  posts,
  loading = false,
  rows = 4,
  onOpen,
}: {
  posts: Post[] | null;
  loading?: boolean;
  rows?: number;
  onOpen?: () => void;
}) {
  const { t } = useTranslation();
  const visible = (posts ?? []).slice(0, rows);

  return (
    <Tile
      label="In the community"
      className="flex flex-col"
      action={
        onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="text-[11px] font-semibold text-accent transition hover:brightness-110"
          >
            Open →
          </button>
        )
      }
    >
      {loading && <Loading rows={rows} />}

      {!loading && visible.length === 0 && (
        <div className="flex flex-col items-start gap-1 py-6">
          <p className="text-[12.5px] text-zinc-500">{t("cpSinNada")}</p>
          <button
            type="button"
            onClick={onOpen}
            className="text-[11.5px] font-semibold text-accent transition hover:brightness-110"
          >
            Be the first to post →
          </button>
        </div>
      )}

      {!loading && visible.length > 0 && (
        <div className="flex flex-col divide-y divide-white/[0.05]">
          {visible.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={onOpen}
              className="group flex items-start gap-3 py-3 text-left transition first:pt-0 hover:opacity-90"
            >
              <Avatar post={post} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="truncate text-[12.5px] font-semibold text-zinc-200">
                    {post.profile?.display_name || post.profile?.username || "Someone"}
                  </span>
                  <span className="flex-shrink-0 text-[10px] text-zinc-600">
                    {ago(post.created_at)}
                  </span>
                </div>
                {/* Two lines: enough to know whether it's worth opening,
                    not so much that the card becomes the feed itself. */}
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-zinc-500">
                  {post.content}
                </p>
                {(post.vibe_count > 0 || post.comment_count > 0) && (
                  <p className="mt-1 flex items-center gap-3 text-[10px] text-zinc-600">
                    {post.vibe_count > 0 && <span>{post.vibe_count} vibes</span>}
                    {post.comment_count > 0 && (
                      <span>{post.comment_count} {post.comment_count === 1 ? "reply" : "replies"}</span>
                    )}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </Tile>
  );
}
