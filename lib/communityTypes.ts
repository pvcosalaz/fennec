export type PostCategory = "music" | "gear" | "sync" | "business" | "mindset" | "general";
export type MediaType = "audio" | "image" | "gif" | "video-embed" | "link" | null;

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
  fennec_db_score: number;
  created_at: string;
};

export type Post = {
  id: string;
  user_id: string;
  content: string;
  category: PostCategory;
  media_url: string | null;
  media_type: MediaType;
  media_name: string | null;
  link_url: string | null;
  link_title: string | null;
  repost_of: string | null;
  created_at: string;
  // joined
  profile: Profile;
  vibe_count: number;
  comment_count: number;
  user_vibed: boolean;
  user_bookmarked: boolean;
  repost_post?: Post | null;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  gif_url: string | null;
  created_at: string;
  profile: Profile;
  vibe_count: number;
  user_vibed: boolean;
};

export const CATEGORIES: { id: PostCategory; label: string; emoji: string }[] = [
  { id: "music",    label: "Music",          emoji: "🎵" },
  { id: "gear",     label: "Gear & Tools",   emoji: "🎛️" },
  { id: "sync",     label: "Sync & Scoring", emoji: "🎬" },
  { id: "business", label: "Business",       emoji: "💼" },
  { id: "mindset",  label: "Mindset",        emoji: "🧠" },
  { id: "general",  label: "General",        emoji: "💬" },
];
