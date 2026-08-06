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

// contact_phone is intentionally excluded: it is not readable by signed-out visitors.
const PUBLIC_COLUMNS =
  "id,owner_id,title,area,bhk,rent,deposit,maintenance,negotiable,furnishing,tenant,owner_verified,community_verified,suspicious_price,metro_km,it_corridor_km,sqft,available_from,amenities,photos,lng,lat,source,votes,created_at";

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
    .select(PUBLIC_COLUMNS)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as DbListingRow[]).map(toListing);
}

export interface ListingDetail extends Listing {
  photoPaths: string[];
  ownerId: string | null;
}

export async function fetchListingById(id: string): Promise<ListingDetail | null> {
  const { data, error } = await supabase
    .from("listings")
    .select(PUBLIC_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as DbListingRow;
  return {
    ...toListing(row),
    photoPaths: row.photos ?? [],
    ownerId: row.owner_id,
  };
}

// contact_phone is not readable directly from the table by any client role.
// Signed-in users get it through an authenticated server function that checks
// the session and listing visibility server-side.
export async function fetchContactPhone(id: string): Promise<string | null> {
  const { getListingContactPhone } = await import("./listing-contact.functions");
  const res = await getListingContactPhone({ data: { listingId: id } });
  return res.phone;
}


export async function signedPhotoUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("listing-photos").createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
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

export async function createListing(
  input: NewListingInput,
  ownerId: string,
  files: File[],
  onProgress?: (done: number, total: number) => void,
) {
  const photos: string[] = [];
  const queue = files.slice(0, 6);
  onProgress?.(0, queue.length);
  for (const file of queue) {
    const path = `${ownerId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("listing-photos").upload(path, file);
    if (error) throw error;
    photos.push(path);
    onProgress?.(photos.length, queue.length);
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

export async function fetchVerifiedPhones(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("verified_phones")
    .select("phone")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.phone as string);
}
