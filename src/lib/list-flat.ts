import { z } from "zod";

export const AREAS: Record<string, [number, number]> = {
  Madhapur: [78.3908, 17.4483],
  Gachibowli: [78.3489, 17.4401],
  Kondapur: [78.3639, 17.4622],
  Ameerpet: [78.4483, 17.4374],
  Kukatpally: [78.4089, 17.4948],
  "Jubilee Hills": [78.4089, 17.4239],
  Nanakramguda: [78.3364, 17.4211],
  Begumpet: [78.4614, 17.4435],
  Manikonda: [78.3838, 17.4021],
  Himayatnagar: [78.4867, 17.4009],
};

export const FURNISHING = ["Unfurnished", "Semi Furnished", "Fully Furnished"];
export const TENANTS = ["Family", "Bachelor", "Anyone"];
export const AMENITIES = [
  "Lift",
  "Power Backup",
  "Parking",
  "Gym",
  "Swimming Pool",
  "Security",
  "Water Supply 24x7",
  "Pet Friendly",
];
export const AVAILABILITY = ["Immediate", "Within 15 days", "Next month", "After 2 months"];
export const CITIES = ["Hyderabad"];
export const HOUSE_TYPES = ["Flat", "Villa"] as const;
export const PARKING = ["None", "Bike", "Car", "Bike + Car"];
export const FACING = ["East", "West", "North", "South", "North-East", "South-East"];

export interface FlatDraft {
  title: string;
  description: string;
  city: string;
  house_type: string;
  area: string;
  lng: number;
  lat: number;
  bhk: number;
  bathrooms: number;
  balconies: number;
  floor: number;
  total_floors: number;
  parking: string;
  facing: string;
  sqft: number;
  furnishing: string;
  tenant: string;
  amenities: string[];
  available_from: string;
  metro_km: number;
  it_corridor_km: number;
  rent: number;
  deposit: number;
  maintenance: number;
  negotiable: boolean;
  contact_phone: string;
}

export const emptyDraft: FlatDraft = {
  title: "",
  description: "",
  city: "Hyderabad",
  house_type: "Flat",
  area: "Madhapur",
  lng: AREAS["Madhapur"]![0],
  lat: AREAS["Madhapur"]![1],
  bhk: 2,
  bathrooms: 2,
  balconies: 1,
  floor: 2,
  total_floors: 5,
  parking: "Bike + Car",
  facing: "East",
  sqft: 1000,
  furnishing: "Semi Furnished",
  tenant: "Anyone",
  amenities: [],
  available_from: "Immediate",
  metro_km: 1,
  it_corridor_km: 2,
  rent: 25000,
  deposit: 80000,
  maintenance: 1500,
  negotiable: true,
  contact_phone: "",
};

const phoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export const stepSchemas = [
  z.object({
    area: z.string().refine((v) => v in AREAS, "Pick an area in Hyderabad"),
    lng: z.number().min(78).max(79),
    lat: z.number().min(17).max(18),
  }),
  z.object({
    title: z.string().trim().min(6, "Add a short descriptive title").max(120),
    bhk: z.number().int().min(1, "BHK must be at least 1").max(6, "Max 6 BHK"),
    sqft: z.number().int().min(100, "Enter a realistic carpet area").max(20_000),
    furnishing: z.string().min(1),
    tenant: z.string().min(1),
    available_from: z.string().trim().min(1, "Pick availability").max(40),
    metro_km: z.number().min(0).max(60, "Distance looks too far"),
    it_corridor_km: z.number().min(0).max(60, "Distance looks too far"),
  }),
  z.object({
    rent: z.number().int().min(1000, "Rent must be at least ₹1,000").max(1_000_000),
    deposit: z.number().int().min(0).max(10_000_000),
    maintenance: z.number().int().min(0).max(100_000),
  }),
  z.object({}),
  z.object({
    contact_phone: z
      .string()
      .trim()
      .refine((v) => phoneRegex.test(v.replace(/\s|-/g, "")), "Enter a valid 10-digit Indian mobile number"),
  }),
];

export const STEPS = [
  { key: "location", label: "Location", hint: "Where is the flat?" },
  { key: "details", label: "Property", hint: "Tell tenants about the home" },
  { key: "pricing", label: "Pricing", hint: "Rent, deposit and maintenance" },
  { key: "photos", label: "Photos", hint: "Homes with photos get 4x more calls" },
  { key: "review", label: "Review", hint: "Check and publish" },
] as const;

const DRAFT_KEY = "nakko:list-flat-draft";

export function loadDraft(): FlatDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return { ...emptyDraft, ...(JSON.parse(raw) as Partial<FlatDraft>) };
  } catch {
    return null;
  }
}

export function saveDraft(draft: FlatDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage full or blocked — drafts are best-effort */
  }
}

export function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/** Rough market bands (₹/sqft/month) used to warn about outlier pricing. */
const AREA_RATE: Record<string, number> = {
  Madhapur: 28,
  Gachibowli: 29,
  Kondapur: 24,
  Ameerpet: 22,
  Kukatpally: 19,
  "Jubilee Hills": 37,
  Nanakramguda: 27,
  Begumpet: 23,
  Manikonda: 22,
  Himayatnagar: 24,
};

export function priceHint(draft: FlatDraft): { tone: "ok" | "low" | "high"; text: string } {
  const rate = AREA_RATE[draft.area] ?? 24;
  const expected = Math.round((rate * draft.sqft) / 500) * 500;
  const ratio = draft.rent / Math.max(expected, 1);
  if (ratio < 0.6)
    return { tone: "low", text: `Similar homes in ${draft.area} ask around ₹${expected.toLocaleString("en-IN")}. Low prices get flagged by the community.` };
  if (ratio > 1.6)
    return { tone: "high", text: `That's well above the ₹${expected.toLocaleString("en-IN")} typical for ${draft.sqft} sqft in ${draft.area}.` };
  return { tone: "ok", text: `In line with ${draft.area} — around ₹${expected.toLocaleString("en-IN")} for this size.` };
}

export function completeness(draft: FlatDraft, photoCount: number): number {
  const checks = [
    draft.title.trim().length >= 6,
    !!AREAS[draft.area],
    draft.rent >= 1000,
    draft.sqft >= 100,
    draft.amenities.length > 0,
    photoCount > 0,
    photoCount >= 3,
    draft.contact_phone.trim().length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** Last 10 digits of a valid Indian mobile number, else null. */
export function normalizeIndianPhone(input: string): string | null {
  const last10 = input.replace(/\D/g, "").slice(-10);
  return /^[6-9]\d{9}$/.test(last10) ? last10 : null;
}
