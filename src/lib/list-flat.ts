import { z } from "zod";
import {
  CITIES as CITY_NAMES,
  areaRate,
  areasForCity,
  withinCity,
} from "@/lib/cities";

export { areasForCity, areaNames, defaultAreaFor, cityLabel } from "@/lib/cities";

/** Every locality across every city — handy for lookups that ignore the city. */
export const AREAS: Record<string, [number, number]> = Object.fromEntries(
  CITY_NAMES.flatMap((c) => Object.entries(areasForCity(c))),
);

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
export { OCCUPANCY_OPTIONS, availabilityText, validateAvailability, todayISO, legacyAvailableFrom } from "@/lib/availability";
export type { OccupancyStatus } from "@/lib/availability";
export const CITIES = CITY_NAMES;
export const HOUSE_TYPES = ["Flat", "Villa"] as const;
export const PARKING = ["None", "Bike", "Car", "Bike + Car"];
export const FACING = ["East", "West", "North", "South", "North-East", "South-East"];

export interface FlatDraft {
  enteredFields?: string[];
  confirmedSections?: number[];
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
  /** Single availability model: occupancy first, then the relevant date. */
  occupancy_status: "vacant" | "occupied";
  /** ISO date — move-in date when vacant, expected vacancy when occupied; "" = not decided (occupied only). */
  available_from_date: string;
  map_visible: boolean;
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
  occupancy_status: "vacant",
  available_from_date: "",
  map_visible: true,
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
  z
    .object({
      city: z.string().refine((v) => CITIES.includes(v), "Pick a city"),
      house_type: z.string().refine((v) => (HOUSE_TYPES as readonly string[]).includes(v), "Pick Flat or Villa"),
      area: z.string().trim().min(1, "Enter the locality for your pin").max(200),
      lng: z.number(),
      lat: z.number(),
    })
    .superRefine((v, ctx) => {
      const city = v.city;
      if (!withinCity(city, v.lng, v.lat)) {
        ctx.addIssue({
          code: "custom",
          path: ["lat"],
          message: `That pin is outside ${city} — move it inside the city`,
        });
      }
    }),
  z.object({
    title: z.string().trim().min(6, "Add a short descriptive title").max(120),
    description: z.string().trim().min(30, "Describe the home in at least 30 characters").max(2000),
    bhk: z.number().int().min(1, "BHK must be at least 1").max(6, "Max 6 BHK"),
    bathrooms: z.number().int().min(1, "At least 1 bathroom").max(10),
    balconies: z.number().int().min(0).max(10),
    floor: z.number().int().min(0, "Floor cannot be negative").max(100),
    total_floors: z.number().int().min(0).max(100),
    parking: z.string().min(1, "Select parking"),
    facing: z.string().min(1, "Select facing"),
    sqft: z.number().int().min(100, "Enter a realistic carpet area").max(20_000),
    furnishing: z.string().min(1),
    tenant: z.string().min(1),
    occupancy_status: z.enum(["vacant", "occupied"]),
    available_from_date: z.string(),
    metro_km: z.number().min(0).max(60, "Distance looks too far"),
    it_corridor_km: z.number().min(0).max(60, "Distance looks too far"),
  })
    .refine((v) => v.total_floors === 0 || v.floor <= v.total_floors, {
      message: "Floor cannot be above the building's total floors",
      path: ["floor"],
    })
    .superRefine((v, ctx) => {
      const message = validateAvailability({
        occupancyStatus: v.occupancy_status,
        availabilityDate: v.available_from_date,
      });
      if (message) ctx.addIssue({ code: "custom", path: ["available_from_date"], message });
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

export const SECTION_FIELDS: readonly (readonly string[])[] = [
  ["city", "house_type", "area", "lng", "lat"],
  ["title", "description", "bhk", "bathrooms", "balconies", "floor", "total_floors", "parking", "facing", "sqft", "furnishing", "tenant", "occupancy_status", "available_from_date", "metro_km", "it_corridor_km"],
  ["rent", "deposit", "maintenance"],
  [],
  ["contact_phone"],
];

export function sectionStatuses(draft: FlatDraft, photoCount: number) {
  const entered = new Set(draft.enteredFields ?? []);
  return STEPS.map((section, index) => {
    if (section.key === "photos") return { label: section.label, complete: photoCount > 0, touched: photoCount > 0, errors: 0, optional: true };
    const fields = SECTION_FIELDS[index] ?? [];
    const parsed = stepSchemas[index]?.safeParse(draft);
    const invalidFields = parsed && !parsed.success ? new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "form"))) : new Set<string>();
    const confirmed = draft.confirmedSections?.includes(index) ?? false;
    if (!confirmed) for (const field of fields) if (!entered.has(field)) invalidFields.add(field);
    const errors = invalidFields.size;
    const touched = fields.some((field) => entered.has(field)) || confirmed;
    const complete = !!parsed?.success && (confirmed || fields.every((field) => entered.has(field)));
    return { label: section.label, complete, touched, errors, optional: false };
  });
}

/** Legacy drafts only confirm sections the owner already continued past. */
export function restoreFlatDraft(draft: Partial<FlatDraft>, step: number): FlatDraft {
  return { ...emptyDraft, ...draft, enteredFields: draft.enteredFields ?? [], confirmedSections: draft.confirmedSections ?? [0, 1, 2, 4].filter((index) => index < step) };
}

const DRAFT_KEY = "nakko:list-flat-draft";

export interface DraftState {
  draft: FlatDraft;
  step: number;
  savedAt: number;
}

/** Reads the autosaved draft plus its metadata (step + last saved time). */
export function loadDraftState(): DraftState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftState> & Partial<FlatDraft>;
    // Support the older shape where the draft itself was stored at the root.
    if (parsed && typeof parsed === "object" && "draft" in parsed && parsed.draft) {
      return {
        draft: restoreFlatDraft(parsed.draft, typeof parsed.step === "number" ? parsed.step : 0),
        step: typeof parsed.step === "number" ? parsed.step : 0,
        savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : Date.now(),
      };
    }
    return { draft: { ...emptyDraft, ...(parsed as Partial<FlatDraft>) }, step: 0, savedAt: Date.now() };
  } catch {
    return null;
  }
}

export function loadDraft(): FlatDraft | null {
  return loadDraftState()?.draft ?? null;
}

/** Autosaves the draft locally. Returns the timestamp written, or null if blocked. */
export function saveDraft(draft: FlatDraft, step = 0): number | null {
  if (typeof window === "undefined") return null;
  try {
    const savedAt = Date.now();
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step, savedAt } satisfies DraftState));
    return savedAt;
  } catch {
    /* storage full or blocked — drafts are best-effort */
    return null;
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


export function priceHint(draft: FlatDraft): { tone: "ok" | "low" | "high"; text: string } {
  const rate = areaRate(draft.city, draft.area);
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
    !!draft.area.trim() && withinCity(draft.city, draft.lng, draft.lat),
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
