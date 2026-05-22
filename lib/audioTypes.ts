export type TrackCategory =
  | "Demo"
  | "Missing Mix"
  | "Idea"
  | "Missing Master"
  | "Final Version";

export const TRACK_CATEGORIES: TrackCategory[] = [
  "Demo",
  "Missing Mix",
  "Idea",
  "Missing Master",
  "Final Version",
];

export const CATEGORY_COLORS: Record<TrackCategory, string> = {
  "Demo":           "bg-blue-500/20 text-blue-400",
  "Missing Mix":    "bg-purple-500/20 text-purple-400",
  "Idea":           "bg-green-500/20 text-green-400",
  "Missing Master": "bg-orange-500/20 text-orange-400",
  "Final Version":  "bg-amber-500/20 text-amber-400",
};

export type ProjectReview = {
  id: string;
  user_id: string;
  title: string;
  category: TrackCategory;
  audio_url: string;
  artwork_url: string | null;
  duration_seconds: number;
  created_at: string;
  // joined
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  comment_count: number;
};

export type ReviewComment = {
  id: string;
  track_id: string;
  user_id: string;
  body: string;
  timestamp_seconds: number | null;
  created_at: string;
  // joined
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
};
