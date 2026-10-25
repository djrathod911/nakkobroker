import { withinCity } from "@/lib/cities";

export interface ListingLocation {
  area: string;
  lng: number;
  lat: number;
}

export interface AddressComponent {
  longText?: string;
  types?: string[];
}

/** Prefer the neighbourhood over the landmark or the city name. */
export function localityFromAddress(components: AddressComponent[], fallback: string): string {
  for (const type of ["sublocality_level_1", "sublocality", "neighborhood", "sublocality_level_2", "locality"]) {
    const name = components.find((component) => component.types?.includes(type))?.longText?.trim();
    if (name) return name;
  }
  return fallback.trim();
}

export function selectedListingLocation(city: string, location: ListingLocation): ListingLocation {
  if (!withinCity(city, location.lng, location.lat)) {
    throw new Error(`That location is outside ${city} — select an address inside the city`);
  }
  const area = location.area.trim();
  if (!area) throw new Error("Enter the locality for this location");
  return { area, lng: location.lng, lat: location.lat };
}

/** A moved pin needs a fresh locality confirmation, not the previous address. */
export function movedListingPin(lng: number, lat: number): ListingLocation {
  return { lng, lat, area: "" };
}