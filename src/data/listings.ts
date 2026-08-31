export type Furnishing = "Unfurnished" | "Semi Furnished" | "Fully Furnished";
export type Tenant = "Family" | "Bachelor" | "Anyone";

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
  postedDaysAgo: number;
  amenities: string[];
  votes: number;
  lng: number;
  lat: number;
  source: "Owner" | "To-Let Board";
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
