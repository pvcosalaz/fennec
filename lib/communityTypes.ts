export type AccountType = "artist" | "producer";

export type PostCategory = "music" | "gear" | "sync" | "business" | "mindset" | "general";
export type MediaType = "audio" | "image" | "gif" | "video-embed" | "link" | null;

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  is_pro: boolean;
  /** Cuenta del equipo: ve herramientas de prueba (switch Producer/Artist en
   *  Ajustes). Se otorga a mano por SQL, nunca desde la app. */
  is_admin?: boolean;
  is_bot: boolean;
  fennec_db_score: number;
  /** Immutable global join number — order this producer joined Fennec (#0042). */
  fennec_number?: number | null;
  created_at: string;
  // Extended profile fields
  bio: string | null;
  genres: string[];
  worked_with: string | null;
  worked_in: string | null;
  banner_url: string | null;
  studio_photo_url: string | null;
  studio_photo_luma: number | null;
  // Settings fields
  display_name: string | null;
  role: string | null;
  country: string | null;
  instagram: string | null;
  spotify: string | null;
  youtube_url: string | null;
  tiktok: string | null;
  color_id: string | null;
  /** Que modulo de negocio ve la cuenta. NULL = todavia no se le ha preguntado,
   *  que es lo que dispara la pantalla de bienvenida. NO es identidad publica:
   *  eso lo lleva `role`. Ver supabase/migrations/20260818_account_type.sql */
  account_type?: AccountType | null;
  // Social stats — synced via Apify
  ig_followers?: number | null;
  tiktok_followers?: number | null;
  yt_subscribers?: number | null;
  social_synced_at?: string | null;
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

/* `label` es una LLAVE de i18n, no el texto: se resuelve con t() al pintar,
   igual que los estados de proyecto en Business. */
export const CATEGORIES: { id: PostCategory; label: string; emoji: string }[] = [
  { id: "music",    label: "catMusica",   emoji: "🎵" },
  { id: "gear",     label: "catEquipo",   emoji: "🎛️" },
  { id: "sync",     label: "catSync",     emoji: "🎬" },
  { id: "business", label: "catNegocio",  emoji: "💼" },
  { id: "mindset",  label: "catMentalidad", emoji: "🧠" },
  { id: "general",  label: "catGeneral",  emoji: "💬" },
];
