// lib/networkDb.ts
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/communityTypes";
import { randomColorId } from "@/lib/fennecIdPalette";


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
  // Step 1: fetch contact IDs owned by this user
  const { data: connections, error: connError } = await supabase
    .from("network_connections")
    .select("contact_id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true });

  if (connError) {
    console.error("getNetworkContacts (connections):", connError.message, connError.code);
    return [];
  }

  if (!connections || connections.length === 0) return [];

  const contactIds = connections.map((c) => c.contact_id as string);

  // Step 2: fetch the profiles for those IDs
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", contactIds);

  if (profilesError) {
    console.error("getNetworkContacts (profiles):", profilesError.message, profilesError.code);
    return [];
  }

  return (profiles ?? []) as Profile[];
}
