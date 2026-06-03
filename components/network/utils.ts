// components/network/utils.ts
import type { Profile } from "@/lib/communityTypes";

export function getInitials(profile: Profile): string {
  const name = profile.display_name || profile.username || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getFirstLast(profile: Profile): { firstName: string; lastName: string } {
  const name = profile.display_name || profile.username || "Unknown";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  return { firstName: name, lastName: "" };
}
