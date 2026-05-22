"use client";
import { useEffect, useState } from "react";
import { Music2, ListMusic, User } from "lucide-react";
import type { ProjectReview } from "@/lib/audioTypes";
import { fetchRandomReviews } from "@/lib/audioDb";
import ProjectReviewPlayer from "./ProjectReviewPlayer";
import MyTracksView from "./MyTracksView";
import IdeasModule from "@/components/ideas/IdeasModule";

type AudioTab = "review" | "melody" | "mine";

type Props = {
  userId: string;
  isPro: boolean;
};

export default function AudioModule({ userId, isPro }: Props) {
  const [activeTab, setActiveTab]   = useState<AudioTab>("review");
  const [queue, setQueue]           = useState<ProjectReview[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [skipStreak, setSkipStreak] = useState(0);

  useEffect(() => {
    fetchRandomReviews(userId, 10)
      .then((tracks) => {
        setQueue(tracks);
        setQueueIndex(0);
      })
      .catch(console.error)
      .finally(() => setLoadingQueue(false));
  }, [userId]);

  function handlePass() {
    if (queueIndex + 1 >= queue.length) {
      setLoadingQueue(true);
      fetchRandomReviews(userId, 10)
        .then((tracks) => { setQueue(tracks); setQueueIndex(0); })
        .catch(console.error)
        .finally(() => setLoadingQueue(false));
    } else {
      setQueueIndex((i) => i + 1);
    }
  }

  const currentTrack = queue[queueIndex] ?? null;

  const tabs: { id: AudioTab; label: string; icon: React.ElementType }[] = [
    { id: "review", label: "Review",      icon: Music2 },
    { id: "melody", label: "Melody Bank", icon: ListMusic },
    { id: "mine",   label: "Mine",        icon: User },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-32">
      {/* Tab row */}
      <div className="flex gap-2 mb-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                active
                  ? "bg-amber-500 text-black"
                  : "bg-white/5 text-zinc-500 hover:text-white border border-white/10"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Review tab */}
      {activeTab === "review" && (
        <>
          {loadingQueue && (
            <p className="text-xs text-zinc-600 text-center py-16">Loading tracks...</p>
          )}
          {!loadingQueue && !currentTrack && (
            <p className="text-xs text-zinc-600 text-center py-16">
              No tracks available for review right now. Check back later!
            </p>
          )}
          {!loadingQueue && currentTrack && (
            <ProjectReviewPlayer
              key={currentTrack.id}
              track={currentTrack}
              userId={userId}
              onPass={handlePass}
              skipStreak={skipStreak}
              onSkipStreakChange={setSkipStreak}
            />
          )}
        </>
      )}

      {/* Melody Bank tab */}
      {activeTab === "melody" && (
        <IdeasModule onBack={() => setActiveTab("review")} />
      )}

      {/* Mine tab */}
      {activeTab === "mine" && (
        <MyTracksView userId={userId} isPro={isPro} />
      )}
    </div>
  );
}
