import { supabase } from "@/integrations/supabase/client";
import type { Listing } from "@/data/listings";
import { toListing, type DbListingRow } from "@/lib/listings.api";

const LISTING_COLUMNS =
  "id,owner_id,title,city,house_type,description,bathrooms,balconies,floor,total_floors,parking,facing,area,bhk,rent,deposit,maintenance,negotiable,furnishing,tenant,owner_verified,community_verified,suspicious_price,metro_km,it_corridor_km,sqft,available_from,availability_status,available_from_date,map_visible,amenities,photos,lng,lat,source,votes,created_at";

/** Ids of the homes the signed-in tenant has hearted. */
export async function fetchSavedListingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.listing_id as string);
}

export interface SavedListing extends Listing {
  savedAt: string;
  photoPaths: string[];
}

export async function fetchSavedListings(userId: string): Promise<SavedListing[]> {
  const { data, error } = await supabase
    .from("saved_listings")
    .select("listing_id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (!rows.length) return [];

  const ids = rows.map((r) => r.listing_id as string);
  const listings = await supabase.from("listings").select(LISTING_COLUMNS).in("id", ids);
  if (listings.error) throw listings.error;

  const byId = new Map(
    (listings.data as unknown as DbListingRow[]).map((row) => [row.id, row]),
  );

  return rows
    .map((r) => {
      const row = byId.get(r.listing_id as string);
      if (!row) return null;
      return {
        ...toListing(row),
        photoPaths: row.photos ?? [],
        savedAt: r.created_at as string,
      } satisfies SavedListing;
    })
    .filter((l): l is SavedListing => l !== null);
}

export async function toggleSavedListing(listingId: string, userId: string, saved: boolean) {
  if (saved) {
    const { error } = await supabase
      .from("saved_listings")
      .delete()
      .eq("listing_id", listingId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("saved_listings")
    .insert({ listing_id: listingId, user_id: userId });
  if (error && error.code !== "23505") throw error;
}
