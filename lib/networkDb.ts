// lib/networkDb.ts
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/communityTypes";
import { randomColorId } from "@/lib/fennecIdPalette";

type NetworkConnectionRow = {
  profiles: Profile | null;
};

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

  return ((data ?? []) as unknown as NetworkConnectionRow[])
    .map((row) => row.profiles)
    .filter((p): p is Profile => p !== null);
}
