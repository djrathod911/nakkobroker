import { supabase } from "@/integrations/supabase/client";
import type { Filters } from "@/components/listings/FilterPanel";

export interface SavedAlert {
  id: string;
  name: string;
  bhk: number[];
  maxRent: number;
  furnishing: string[];
  amenities: string[];
  ownerOnly: boolean;
  instant: boolean;
  dailyDigest: boolean;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  alertId: string | null;
  listingId: string | null;
  kind: "instant" | "digest";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export async function fetchSavedAlerts(): Promise<SavedAlert[]> {
  const { data, error } = await supabase
    .from("saved_alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    bhk: r.bhk ?? [],
    maxRent: r.max_rent,
    furnishing: r.furnishing ?? [],
    amenities: r.amenities ?? [],
    ownerOnly: r.owner_only,
    instant: r.instant,
    dailyDigest: r.daily_digest,
    createdAt: r.created_at,
  }));
}

export async function createSavedAlert(
  userId: string,
  name: string,
  filters: Filters,
  opts: { instant: boolean; dailyDigest: boolean },
) {
  const { error } = await supabase.from("saved_alerts").insert({
    user_id: userId,
    name: name.trim().slice(0, 60) || "My alert",
    bhk: filters.bhk,
    max_rent: filters.maxRent,
    furnishing: filters.furnishing,
    amenities: filters.amenities,
    owner_only: filters.ownerOnly,
    instant: opts.instant,
    daily_digest: opts.dailyDigest,
  });
  if (error) throw error;
}

export async function deleteSavedAlert(id: string) {
  const { error } = await supabase.from("saved_alerts").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    alertId: r.alert_id,
    listingId: r.listing_id,
    kind: r.kind === "digest" ? "digest" : "instant",
    title: r.title,
    body: r.body,
    read: r.read,
    createdAt: r.created_at,
  }));
}

export async function markNotificationsRead(ids: string[]) {
  if (!ids.length) return;
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
  if (error) throw error;
}

export async function deleteNotification(id: string) {
  const { error } = await supabase.from("notifications").delete().eq("id", id);
  if (error) throw error;
}
