/**
 * Single source of truth for every city NakkoBroker serves.
 *
 * Everything city-related — map centres, locality pins, market rates, search
 * bias and validation bounds — is derived from here so a home can never be
 * saved with an area that belongs to another city, and so city names stay
 * canonical (no "Bangalore" vs "Bengaluru" duplicates in the database).
 */

export interface CityInfo {
  name: string;
  /** Map centre as [lng, lat]. */
  center: [number, number];
  /** Rough city bounding box used to validate a dropped pin. */
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number };
  /** Locality name -> [lng, lat]. */
  areas: Record<string, [number, number]>;
  /** Locality name -> typical ₹ per sqft per month. */
  rates: Record<string, number>;
  /** Fallback rate for localities not listed above. */
  baseRate: number;
  /** Other spellings people type or that might already exist in data. */
  aliases: string[];
}

const CITY_LIST: CityInfo[] = [
  {
    name: "Hyderabad",
    center: [78.4483, 17.4239],
    bounds: { minLng: 78.0, maxLng: 79.0, minLat: 17.0, maxLat: 17.95 },
    areas: {
      Madhapur: [78.3908, 17.4483],
      Gachibowli: [78.3489, 17.4401],
      Kondapur: [78.3639, 17.4622],
      "Hitech City": [78.3789, 17.4456],
      Ameerpet: [78.4483, 17.4374],
      Kukatpally: [78.4089, 17.4948],
      "Banjara Hills": [78.4400, 17.4126],
      "Jubilee Hills": [78.4089, 17.4239],
      Nanakramguda: [78.3364, 17.4211],
      Begumpet: [78.4614, 17.4435],
      Manikonda: [78.3838, 17.4021],
      Himayatnagar: [78.4867, 17.4009],
      Miyapur: [78.3496, 17.4968],
      Narsingi: [78.3510, 17.3920],
      Secunderabad: [78.4983, 17.4399],
      "LB Nagar": [78.5520, 17.3510],
    },
    rates: {
      Madhapur: 28,
      Gachibowli: 29,
      Kondapur: 24,
      "Hitech City": 30,
      Ameerpet: 22,
      Kukatpally: 19,
      "Banjara Hills": 35,
      "Jubilee Hills": 37,
      Nanakramguda: 27,
      Begumpet: 23,
      Manikonda: 22,
      Himayatnagar: 24,
      Miyapur: 18,
      Narsingi: 23,
      Secunderabad: 21,
      "LB Nagar": 17,
    },
    baseRate: 24,
    aliases: ["hyd", "haidarabad"],
  },
  {
    name: "Bengaluru",
    center: [77.5946, 12.9716],
    bounds: { minLng: 77.3, maxLng: 77.95, minLat: 12.7, maxLat: 13.35 },
    areas: {
      Koramangala: [77.6245, 12.9352],
      Indiranagar: [77.6408, 12.9784],
      "HSR Layout": [77.6480, 12.9116],
      Whitefield: [77.7500, 12.9698],
      Jayanagar: [77.5833, 12.9250],
      Marathahalli: [77.6974, 12.9592],
      "Electronic City": [77.6770, 12.8452],
      Hebbal: [77.5946, 13.0358],
      "Bellandur": [77.6780, 12.9260],
      "Rajajinagar": [77.5540, 12.9910],
    },
    rates: {
      Koramangala: 40,
      Indiranagar: 42,
      "HSR Layout": 34,
      Whitefield: 28,
      Jayanagar: 30,
      Marathahalli: 28,
      "Electronic City": 22,
      Hebbal: 28,
      Bellandur: 30,
      Rajajinagar: 26,
    },
    baseRate: 30,
    aliases: ["bangalore", "bengalooru", "blr"],
  },
  {
    name: "Chennai",
    center: [80.2707, 13.0827],
    bounds: { minLng: 79.9, maxLng: 80.45, minLat: 12.7, maxLat: 13.4 },
    areas: {
      Adyar: [80.2574, 13.0067],
      Velachery: [80.2207, 12.9791],
      "T Nagar": [80.2340, 13.0418],
      "Anna Nagar": [80.2100, 13.0850],
      OMR: [80.2430, 12.9200],
      Porur: [80.1560, 13.0350],
      Guindy: [80.2120, 13.0100],
      Perungudi: [80.2430, 12.9640],
    },
    rates: {
      Adyar: 32,
      Velachery: 26,
      "T Nagar": 30,
      "Anna Nagar": 28,
      OMR: 24,
      Porur: 22,
      Guindy: 28,
      Perungudi: 25,
    },
    baseRate: 26,
    aliases: ["madras"],
  },
  {
    name: "Pune",
    center: [73.8567, 18.5204],
    bounds: { minLng: 73.6, maxLng: 74.15, minLat: 18.3, maxLat: 18.85 },
    areas: {
      Kothrud: [73.8077, 18.5074],
      Baner: [73.7800, 18.5590],
      Hinjewadi: [73.7389, 18.5913],
      "Viman Nagar": [73.9143, 18.5679],
      Wakad: [73.7600, 18.5980],
      Kharadi: [73.9430, 18.5515],
      "Koregaon Park": [73.8950, 18.5362],
      Hadapsar: [73.9260, 18.5089],
    },
    rates: {
      Kothrud: 26,
      Baner: 28,
      Hinjewadi: 24,
      "Viman Nagar": 28,
      Wakad: 24,
      Kharadi: 26,
      "Koregaon Park": 36,
      Hadapsar: 22,
    },
    baseRate: 26,
    aliases: ["poona", "pcmc", "pimpri chinchwad"],
  },
  {
    name: "Visakhapatnam",
    center: [83.3180, 17.7260],
    bounds: { minLng: 83.0, maxLng: 83.65, minLat: 17.5, maxLat: 18.05 },
    areas: {
      "MVP Colony": [83.3300, 17.7400],
      "Dwaraka Nagar": [83.3060, 17.7290],
      Madhurawada: [83.3800, 17.8200],
      Gajuwaka: [83.2100, 17.6820],
      Seethammadhara: [83.3170, 17.7420],
      Rushikonda: [83.3870, 17.7830],
      "Beach Road": [83.3360, 17.7130],
      "PM Palem": [83.3690, 17.8040],
    },
    rates: {
      "MVP Colony": 20,
      "Dwaraka Nagar": 18,
      Madhurawada: 16,
      Gajuwaka: 14,
      Seethammadhara: 18,
      Rushikonda: 18,
      "Beach Road": 22,
      "PM Palem": 15,
    },
    baseRate: 18,
    aliases: ["vizag", "vishakhapatnam", "visakapatnam", "waltair"],
  },
];

export const CITY_INFO: Record<string, CityInfo> = Object.fromEntries(
  CITY_LIST.map((c) => [c.name, c]),
);

/** Canonical, user-facing city names in display order. */
export const CITIES = CITY_LIST.map((c) => c.name);

export const DEFAULT_CITY = "Hyderabad";

/** Friendly short label (used where "Visakhapatnam" is too long). */
export const CITY_SHORT: Record<string, string> = {
  Visakhapatnam: "Vizag",
};

export const cityLabel = (name: string) => CITY_SHORT[name] ?? name;

/** Maps any spelling to the canonical city name; falls back to Hyderabad. */
export function canonicalCity(input: string | null | undefined): string {
  const q = (input ?? "").trim().toLowerCase();
  if (!q) return DEFAULT_CITY;
  const hit = CITY_LIST.find(
    (c) => c.name.toLowerCase() === q || c.aliases.includes(q),
  );
  return hit?.name ?? DEFAULT_CITY;
}

export function cityOf(name: string | null | undefined): CityInfo {
  return CITY_INFO[canonicalCity(name)]!;
}

export const areasForCity = (city: string) => cityOf(city).areas;

export const areaNames = (city: string) => Object.keys(cityOf(city).areas);

export function defaultAreaFor(city: string): { area: string; lng: number; lat: number } {
  const info = cityOf(city);
  const area = Object.keys(info.areas)[0]!;
  const [lng, lat] = info.areas[area]!;
  return { area, lng, lat };
}

/** True when a dropped pin is plausibly inside the chosen city. */
export function withinCity(city: string, lng: number, lat: number): boolean {
  const b = cityOf(city).bounds;
  return lng >= b.minLng && lng <= b.maxLng && lat >= b.minLat && lat <= b.maxLat;
}

/** Typical ₹/sqft/month for a locality in a city. */
export function areaRate(city: string, area: string): number {
  const info = cityOf(city);
  return info.rates[area] ?? info.baseRate;
}

/** Rectangle used to bias Google Places suggestions to the selected city. */
export function placesBiasFor(city: string) {
  const b = cityOf(city).bounds;
  return {
    rectangle: {
      low: { latitude: b.minLat, longitude: b.minLng },
      high: { latitude: b.maxLat, longitude: b.maxLng },
    },
  };
}
