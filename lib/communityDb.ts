import { supabase } from "./supabase";
import type { Post, Comment, Profile, PostCategory, MediaType } from "./communityTypes";

const PAGE_SIZE = 20;

// ── Profiles ──────────────────────────────────────────────────────

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  return data ?? null;
}

export async function createProfile(userId: string, username: string, avatarUrl: string | null): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, username, avatar_url: avatarUrl })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateDbScore(userId: string, score: number): Promise<void> {
  await supabase.from("profiles").update({ fennec_db_score: score }).eq("id", userId);
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("username", username);
  return (count ?? 0) > 0;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateProfile(userId: string, updates: {
  bio?: string | null;
  genres?: string[];
  worked_with?: string | null;
  worked_in?: string | null;
  avatar_url?: string | null;
  banner_url?: string | null;
  display_name?: string | null;
  role?: string | null;
  country?: string | null;
  instagram?: string | null;
  spotify?: string | null;
  youtube_url?: string | null;
  tiktok?: string | null;
  color_id?: string | null;
  studio_photo_url?: string | null;
  studio_photo_luma?: number | null;
}): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Posts ─────────────────────────────────────────────────────────

export async function fetchPosts(
  category: PostCategory | null,
  page: number,
  currentUserId: string | null
): Promise<Post[]> {
  let query = supabase
    .from("posts")
    .select(`
      *,
      profile:profiles!posts_user_id_fkey(*),
      vibe_count:vibes(count),
      comment_count:comments(count)
    `)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw error;

  const postIds = (data ?? []).map((p) => p.id);
  let userVibes = new Set<string>();
  let userBookmarks = new Set<string>();

  if (currentUserId && postIds.length > 0) {
    const [vibesRes, bookmarksRes] = await Promise.all([
      supabase.from("vibes").select("post_id").eq("user_id", currentUserId).in("post_id", postIds),
      supabase.from("bookmarks").select("post_id").eq("user_id", currentUserId).in("post_id", postIds),
    ]);
    userVibes = new Set((vibesRes.data ?? []).map((v) => v.post_id));
    userBookmarks = new Set((bookmarksRes.data ?? []).map((b) => b.post_id));
  }

  return (data ?? []).map((p) => ({
    ...p,
    vibe_count: p.vibe_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
    user_vibed: userVibes.has(p.id),
    user_bookmarked: userBookmarks.has(p.id),
  }));
}

export async function createPost(params: {
  userId: string;
  content: string;
  category: PostCategory;
  mediaUrl?: string;
  mediaType?: MediaType;
  mediaName?: string;
  linkUrl?: string;
  linkTitle?: string;
  repostOf?: string;
}): Promise<Post> {
  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id:    params.userId,
      content:    params.content,
      category:   params.category,
      media_url:  params.mediaUrl ?? null,
      media_type: params.mediaType ?? null,
      media_name: params.mediaName ?? null,
      link_url:   params.linkUrl ?? null,
      link_title: params.linkTitle ?? null,
      repost_of:  params.repostOf ?? null,
    })
    .select(`*, profile:profiles!posts_user_id_fkey(*)`)
    .single();
  if (error) throw error;
  return { ...data, vibe_count: 0, comment_count: 0, user_vibed: false, user_bookmarked: false };
}

export async function fetchUserPosts(userId: string, currentUserId: string | null): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(`
      *,
      profile:profiles!posts_user_id_fkey(*),
      vibe_count:vibes(count),
      comment_count:comments(count)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;

  const postIds = (data ?? []).map((p) => p.id);
  let userVibes = new Set<string>();
  let userBookmarks = new Set<string>();

  if (currentUserId && postIds.length > 0) {
    const [vibesRes, bookmarksRes] = await Promise.all([
      supabase.from("vibes").select("post_id").eq("user_id", currentUserId).in("post_id", postIds),
      supabase.from("bookmarks").select("post_id").eq("user_id", currentUserId).in("post_id", postIds),
    ]);
    userVibes = new Set((vibesRes.data ?? []).map((v) => v.post_id));
    userBookmarks = new Set((bookmarksRes.data ?? []).map((b) => b.post_id));
  }

  return (data ?? []).map((p) => ({
    ...p,
    vibe_count: p.vibe_count?.[0]?.count ?? 0,
    comment_count: p.comment_count?.[0]?.count ?? 0,
    user_vibed: userVibes.has(p.id),
    user_bookmarked: userBookmarks.has(p.id),
  }));
}

export async function deletePost(postId: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}

// ── Vibes ─────────────────────────────────────────────────────────

export async function toggleVibe(postId: string, userId: string, currentlyVibed: boolean): Promise<void> {
  if (currentlyVibed) {
    await supabase.from("vibes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("vibes").insert({ post_id: postId, user_id: userId });
  }
}

// ── Bookmarks ─────────────────────────────────────────────────────

export async function toggleBookmark(postId: string, userId: string, currentlyBookmarked: boolean): Promise<void> {
  if (currentlyBookmarked) {
    await supabase.from("bookmarks").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("bookmarks").insert({ post_id: postId, user_id: userId });
  }
}

// ── Comments ──────────────────────────────────────────────────────

export async function fetchComments(postId: string, currentUserId: string | null): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select(`*, profile:profiles!comments_user_id_fkey(*), vibe_count:vibes(count)`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((c) => ({
    ...c,
    vibe_count: c.vibe_count?.[0]?.count ?? 0,
    user_vibed: false,
  }));
}

export async function createComment(postId: string, userId: string, content: string, gifUrl?: string): Promise<Comment> {
  const { data: inserted, error: insertError } = await supabase
    .from("comments")
    .insert({ post_id: postId, user_id: userId, content, gif_url: gifUrl ?? null })
    .select("id")
    .single();
  if (insertError) throw insertError;

  const { data, error } = await supabase
    .from("comments")
    .select(`*, profile:profiles(*)`)
    .eq("id", inserted.id)
    .single();
  if (error) throw error;
  return { ...data, vibe_count: 0, user_vibed: false };
}

// ── Storage ───────────────────────────────────────────────────────

export async function uploadAudio(blob: Blob, filename: string): Promise<string> {
  const path = `${Date.now()}-${filename}`;
  const { error } = await supabase.storage.from("community-audio").upload(path, blob, {
    contentType: "audio/webm",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("community-audio").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * The producer's studio photo. Already downscaled and re-encoded to JPEG by
 * prepareStudioPhoto, so this just stores it.
 *
 * Vive en `avatars/` con el uid al frente, igual que el avatar de
 * SettingsModule. CORRECCIÓN (2026-08-02): este path se cambió dos veces
 * persiguiendo un supuesto rechazo de storage, y aquí llegó a estar
 * documentada como hecho probado una teoría sobre la policy del bucket que
 * NUNCA se comprobó. Era falsa: la subida siempre funcionó. Lo que fallaba
 * era el UPDATE posterior a `profiles`, porque a studio_photo_url y
 * studio_photo_luma les faltaba el grant por columna
 * (ver 20260802_studio_photo_grants.sql). El error decía "storage" porque el
 * mismo try envolvía las dos operaciones.
 *
 * Se conserva este path porque está verificado que funciona, no porque
 * sepamos que los otros no. Si alguien necesita moverlo, que lo pruebe.
 *
 * Devuelve también el `path` para poder borrar el archivo si el paso
 * siguiente falla y no dejar huérfanos en el bucket.
 */
export async function uploadStudioPhoto(
  userId: string,
  blob: Blob,
): Promise<{ url: string; path: string }> {
  const path = `avatars/${userId}-studio-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from("community-images").upload(path, blob, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("community-images").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/** Borra un archivo recién subido cuando el paso que lo iba a referenciar
 *  falló. Silencioso a propósito: es limpieza, no debe tapar el error real. */
export async function discardUploadedImage(path: string): Promise<void> {
  try {
    await supabase.storage.from("community-images").remove([path]);
  } catch {
    /* si no se puede borrar, queda un huérfano: molesto, no grave */
  }
}

export async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("community-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("community-images").getPublicUrl(path);
  return data.publicUrl;
}

/** Comentarios recientes de OTROS en tus posts. Para el panel de actividad del
 *  dashboard: "@alguien comentó tu post". Se excluyen los propios (contestar tu
 *  hilo no es una novedad para ti). Best-effort: si falla, devuelve vacio y el
 *  panel simplemente no muestra esa señal. */
export async function fetchRecentCommentsOnMyPosts(
  userId: string,
  limite = 5,
): Promise<{ id: string; postId: string; content: string; createdAt: string; username: string | null }[]> {
  try {
    const { data: mios } = await supabase.from("posts").select("id").eq("user_id", userId).limit(50);
    const ids = (mios ?? []).map((p) => p.id as string);
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from("comments")
      .select("id, post_id, content, created_at, user_id, profile:profiles!comments_user_id_fkey(username)")
      .in("post_id", ids)
      .neq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limite);
    if (error || !data) return [];
    return data.map((c) => ({
      id: c.id as string,
      postId: c.post_id as string,
      content: (c.content as string) ?? "",
      createdAt: c.created_at as string,
      username: (c.profile as { username?: string } | null)?.username ?? null,
    }));
  } catch { return []; }
}
