import { z } from "zod";

export const accommodationTypes = { entire_property: "Entire Property", private_room: "Private Room", shared_room: "Shared Room", bed: "Bed in Shared Accommodation" } as const;
export type AccommodationType = keyof typeof accommodationTypes;
export interface SharedDetails {
  building_name?: string;
  bathroom_type?: string;
  room_furnishing?: string;
  wardrobe?: boolean;
  existing_occupants?: number;
  introduction?: string;
  occupation?: string;
  gender?: string;
  lifestyle?: string;
  smoking?: string;
  food?: string;
  pets?: string;
  household?: string;
  rules?: string;
  landmarks?: string;
  utilities_included?: boolean;
  electricity?: number;
  water?: number;
  internet?: number;
  other?: number;
  photo_labels?: string[];
  total_flat_rent?: number;
  contact_preference?: string;
}
export const sharedDraftSchema = z.object({
  category: z.enum(["flatmate", "room_bed"]),
  relationship: z.enum(["tenant", "owner", "provider"]),
  accommodation: z.enum(["private_room", "shared_room", "bed"]),
  propertyId: z.string().default(""),
  title: z.string().trim().min(6).max(120),
  city: z.string().min(1), area: z.string().trim().min(1),
  lng: z.number(), lat: z.number(),
  bedrooms: z.number().int().min(1).max(20), bathrooms: z.number().int().min(1).max(20), floor: z.number().int().min(0).max(100),
  furnishing: z.enum(["Fully Furnished", "Semi Furnished", "Unfurnished"]),
  amenities: z.array(z.string()), parking: z.string(),
  totalRent: z.number().int().min(0).max(1000000), contribution: z.number().int().min(1).max(1000000), deposit: z.number().int().min(0).max(10000000), maintenance: z.number().int().min(0).max(100000),
  discloseTotal: z.boolean(), availability: z.enum(["available", "available_soon", "occupied"]), availableDate: z.string(),
  description: z.string().max(4000), details: z.custom<SharedDetails>((value) => !!value && typeof value === "object"),
  permission: z.enum(["", "confirmed", "not_required", "pending"]), declaration: z.boolean(), photos: z.array(z.string()),
}).superRefine((v, ctx) => {
  if (v.category === "flatmate" && v.relationship !== "tenant") ctx.addIssue({ code: "custom", path: ["relationship"], message: "Find a Flatmate is for existing tenants" });
  if (v.relationship === "tenant" && (!v.declaration || !v.permission)) ctx.addIssue({ code: "custom", path: ["declaration"], message: "Confirm your tenancy and permissions" });
  if (v.availability === "available_soon" && !v.availableDate) ctx.addIssue({ code: "custom", path: ["availableDate"], message: "Choose a move-in date" });
});
export type SharedDraft = z.infer<typeof sharedDraftSchema>;
export const emptySharedDraft: SharedDraft = {
  category: "flatmate", relationship: "tenant", accommodation: "private_room", propertyId: "", title: "", city: "Hyderabad", area: "Madhapur", lng: 78.3915, lat: 17.4483,
  bedrooms: 2, bathrooms: 2, floor: 0, furnishing: "Fully Furnished", amenities: [], parking: "None", totalRent: 30000, contribution: 15000, deposit: 30000, maintenance: 0,
  discloseTotal: true, availability: "available", availableDate: "", description: "", details: { bathroom_type: "Shared", existing_occupants: 1, utilities_included: false, electricity: 0, water: 0, internet: 0, other: 0, contact_preference: "In-app messages" }, permission: "", declaration: false, photos: [],
};
export function rentSummary(totalRent: number, contribution: number, maintenance: number, details: SharedDetails) {
  const utilities = details.utilities_included ? 0 : (details.electricity ?? 0) + (details.water ?? 0) + (details.internet ?? 0) + (details.other ?? 0);
  return { remainingRent: totalRent - contribution, contribution, utilities, monthlyTotal: contribution + maintenance + utilities };
}
export function isShared(listing: { listingCategory?: string }) { return !!listing.listingCategory && listing.listingCategory !== "entire_property"; }