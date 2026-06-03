// lib/networkDb.ts
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/communityTypes";
import { randomColorId } from "@/lib/fennecIdPalette";

/**
 * If the user's profile has no color_id yet, assign one randomly and persist it.
 * Returns the final color_id (existing or newly assigned).
 */
export async function ensureColorAssigned(userId: string, currentColorId: string | null): Promise<string> {
  if (currentColorId) return currentColorId;

  const newColorId = randomColorId();

  const { error } = await supabase
    .from("profiles")
    .update({ color_id: newColorId })
    .eq("id", userId);

  if (error) {
    console.error("ensureColorAssigned:", error);
  }

  return newColorId;
}

/**
 * Fetch profiles of all producers in the user's network collection.
 */
export async function getNetworkContacts(userId: string): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("network_connections")
    .select("contact_id, profiles!network_connections_contact_id_fkey(*)")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getNetworkContacts:", error);
    return [];
  }

  return (data ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((row: any) => (Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles) as Profile | null)
    .filter((p): p is Profile => p !== null);
}
