export type Furnishing = "Unfurnished" | "Semi Furnished" | "Fully Furnished";
export type Tenant = "Family" | "Bachelor" | "Anyone";
export type AvailabilityStatus = "available" | "occupied" | "available_soon";

export interface Listing {
  id: string;
  title: string;
  /** Optional on demo data; always present on database-backed listings. */
  city?: string;
  houseType?: string;
  description?: string;
  bathrooms?: number;
  balconies?: number;
  floor?: number;
  totalFloors?: number;
  parking?: string;
  facing?: string;
  area: string;
  bhk: number;
  rent: number;
  deposit: number;
  maintenance: number;
  negotiable: boolean;
  furnishing: Furnishing;
  tenant: Tenant;
  ownerVerified: boolean;
  communityVerified: boolean;
  suspiciousPrice?: boolean;
  metroKm: number;
  itCorridorKm: number;
  sqft: number;
  availableFrom: string;
  availabilityStatus: AvailabilityStatus;
  availableFromDate?: string | null; // ISO date string for available_soon
  mapVisible: boolean;
  postedDaysAgo: number;
  amenities: string[];
  votes: number;
  lng: number;
  lat: number;
  source: "Owner" | "To-Let Board";
}

/** Human-readable label for each availability status. */
export function availabilityLabel(listing: Pick<Listing, "availabilityStatus" | "availableFrom" | "availableFromDate">): string {
  switch (listing.availabilityStatus) {
    case "available":
      return listing.availableFrom === "Immediate" ? "Available Now" : `Available from ${listing.availableFrom}`;
    case "occupied":
      return listing.availableFromDate
        ? `Currently Occupied — Available from ${new Date(listing.availableFromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : `Currently Occupied — ${listing.availableFrom}`;
    case "available_soon":
      return listing.availableFromDate
        ? `Available from ${new Date(listing.availableFromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
        : `Available Soon — ${listing.availableFrom}`;
    default:
      return listing.availableFrom;
  }
}

export const HYDERABAD_CENTER: [number, number] = [78.4483, 17.4239];

export const formatRent = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export const shortRent = (value: number) =>
  value >= 100000 ? `${(value / 100000).toFixed(1)}L` : `${Math.round(value / 1000)}k`;
