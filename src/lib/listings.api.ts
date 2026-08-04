import { supabase } from "@/integrations/supabase/client";
import type { Furnishing, Listing, Tenant } from "@/data/listings";

export interface DbListingRow {
  id: string;
  owner_id: string | null;
  title: string;
  area: string;
  bhk: number;
  rent: number;
  deposit: number;
  maintenance: number;
  negotiable: boolean;
  furnishing: string;
  tenant: string;
  owner_verified: boolean;
  community_verified: boolean;
  suspicious_price: boolean;
  metro_km: number;
  it_corridor_km: number;
  sqft: number;
  available_from: string;
  amenities: string[];
  photos: string[];
  lng: number;
  lat: number;
  source: string;
  votes: number;
  created_at: string;
}

const daysAgo = (iso: string) =>
  Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));

export function toListing(row: DbListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    area: row.area,
    bhk: row.bhk,
    rent: row.rent,
    deposit: row.deposit,
    maintenance: row.maintenance,
    negotiable: row.negotiable,
    furnishing: row.furnishing as Furnishing,
    tenant: row.tenant as Tenant,
    ownerVerified: row.owner_verified,
    communityVerified: row.community_verified,
    suspiciousPrice: row.suspicious_price,
    metroKm: Number(row.metro_km),
    itCorridorKm: Number(row.it_corridor_km),
    sqft: row.sqft,
    availableFrom: row.available_from,
    postedDaysAgo: daysAgo(row.created_at),
    amenities: row.amenities ?? [],
    votes: row.votes,
    lng: row.lng,
    lat: row.lat,
    source: row.source === "Owner" ? "Owner" : "To-Let Board",
  };
}

export async function fetchListings(): Promise<Listing[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbListingRow[]).map(toListing);
}

export async function fetchMyVotedIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("listing_votes")
    .select("listing_id")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.listing_id as string);
}

export async function toggleVote(listingId: string, userId: string, voted: boolean) {
  if (voted) {
    const { error } = await supabase
      .from("listing_votes")
      .delete()
      .eq("listing_id", listingId)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from("listing_votes")
    .insert({ listing_id: listingId, user_id: userId });
  if (error) throw error;
}

export interface NewListingInput {
  title: string;
  area: string;
  bhk: number;
  rent: number;
  deposit: number;
  maintenance: number;
  negotiable: boolean;
  furnishing: string;
  tenant: string;
  metro_km: number;
  it_corridor_km: number;
  sqft: number;
  available_from: string;
  amenities: string[];
  contact_phone: string | null;
  lng: number;
  lat: number;
  source: string;
}

export async function createListing(input: NewListingInput, ownerId: string, files: File[]) {
  const photos: string[] = [];
  for (const file of files.slice(0, 6)) {
    const path = `${ownerId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, file);
    if (error) throw error;
    photos.push(path);
  }

  const { data, error } = await supabase
    .from("listings")
    .insert({ ...input, owner_id: ownerId, photos })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function signedPhotoUrl(path: string) {
  const { data } = await supabase.storage.from("listing-photos").createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
