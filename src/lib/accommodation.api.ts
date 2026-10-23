import { supabase } from "@/integrations/supabase/client";
import {
  emptySharedDraft,
  sharedDraftSchema,
  type SharedDraft,
  type SharedDetails,
} from "./accommodation";
import type { Json } from "@/integrations/supabase/types";

export async function saveAccommodation(
  draft: SharedDraft,
  status: "draft" | "published",
  id?: string,
) {
  if (status === "published") sharedDraftSchema.parse(draft);
  const { data, error } = await supabase.rpc("save_accommodation", {
    ...(id ? { _id: id } : {}),
    _listing: {
      title: draft.title || "Untitled room",
      city: draft.city,
      area: draft.area,
      bhk: draft.bedrooms,
      bathrooms: draft.bathrooms,
      floor: draft.floor,
      parking: draft.parking,
      furnishing: draft.furnishing,
      rent: draft.contribution,
      deposit: draft.deposit,
      maintenance: draft.maintenance,
      description: draft.description,
      amenities: draft.amenities,
      photos: draft.photos,
      lng: draft.lng,
      lat: draft.lat,
      listing_category: draft.category,
      accommodation_type: draft.accommodation,
      creator_relationship: draft.relationship,
      property_group_id: draft.propertyId,
      shared_details: draft.details as Json,
      status,
      available_from: draft.availableDate || "Immediate",
      availability_status: draft.availability,
      available_from_date: draft.availableDate,
    } as Json,
    _private: {
      total_flat_rent: draft.totalRent,
      disclose_total_rent: draft.discloseTotal,
      permission_answer: draft.permission,
      permission_confirmed: draft.declaration,
    },
  });
  if (error) throw error;
  return data;
}
export async function loadAccommodation(id: string): Promise<SharedDraft> {
  const [listing, finance] = await Promise.all([
    supabase
      .from("listings")
      .select(
        "id,title,city,area,bhk,bathrooms,floor,parking,furnishing,rent,deposit,maintenance,description,amenities,photos,lng,lat,listing_category,accommodation_type,creator_relationship,property_group_id,shared_details,availability_status,available_from_date",
      )
      .eq("id", id)
      .single(),
    supabase.from("accommodation_private").select("*").eq("listing_id", id).single(),
  ]);
  if (listing.error) throw listing.error;
  if (finance.error) throw finance.error;
  const l = listing.data;
  const p = finance.data;
  return {
    ...emptySharedDraft,
    category: l.listing_category as SharedDraft["category"],
    relationship: l.creator_relationship as SharedDraft["relationship"],
    accommodation: l.accommodation_type as SharedDraft["accommodation"],
    propertyId: l.property_group_id ?? "",
    title: l.title,
    city: l.city,
    area: l.area,
    bedrooms: l.bhk,
    bathrooms: l.bathrooms,
    floor: l.floor,
    parking: l.parking,
    furnishing: l.furnishing as SharedDraft["furnishing"],
    contribution: l.rent,
    deposit: l.deposit,
    maintenance: l.maintenance,
    description: l.description,
    amenities: l.amenities,
    photos: l.photos,
    lng: l.lng,
    lat: l.lat,
    details: l.shared_details as SharedDetails,
    totalRent: p.total_flat_rent,
    discloseTotal: p.disclose_total_rent,
    permission: p.permission_answer as SharedDraft["permission"],
    declaration: p.permission_confirmed,
    availability: l.availability_status as SharedDraft["availability"],
    availableDate: l.available_from_date ?? "",
  };
}
export async function accommodationProperties() {
  const { data, error } = await supabase
    .from("accommodation_properties")
    .select("id,details")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
export async function setAccommodationState(
  id: string,
  patch: { status?: string; availability_status?: string },
) {
  const { error } = await supabase.from("listings").update(patch).eq("id", id);
  if (error) throw error;
}
