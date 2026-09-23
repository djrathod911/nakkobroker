import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEFAULT_CITY, placesBiasFor } from "@/lib/cities";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const GOOGLE_PLACES_URL = "https://places.googleapis.com";

// A key starting with "AIza" is the owner's own Google Cloud key — call Google
// directly. Anything else is a Lovable connector key and must go via the gateway.
function usingOwnGoogleKey() {
  return (process.env["GOOGLE_MAPS_API_KEY"] ?? "").startsWith("AIza");
}

function placesBase() {
  return usingOwnGoogleKey() ? GOOGLE_PLACES_URL : `${GATEWAY_URL}/places`;
}

// Bias suggestions to the city the owner picked, so "MG Road" resolves nearby.
const locationBiasFor = (city?: string) => placesBiasFor(city ?? DEFAULT_CITY);

function gatewayHeaders(): Record<string, string> {
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!mapsKey) throw new Error("Google Maps key is not configured");
  if (usingOwnGoogleKey()) {
    return { "X-Goog-Api-Key": mapsKey, "Content-Type": "application/json" };
  }
  const lovableKey = process.env["LOVABLE_API_KEY"];
  if (!lovableKey) throw new Error("Google Maps connector is not linked");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
  };
}

export interface PlaceSuggestion {
  placeId: string;
  text: string;
}

export const searchPlaces = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        input: z.string().trim().min(2).max(120),
        sessionToken: z.string().uuid(),
        city: z.string().trim().max(60).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    const res = await fetch(`${placesBase()}/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        ...gatewayHeaders(),
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      },
      body: JSON.stringify({
        input: data.input,
        sessionToken: data.sessionToken,
        locationBias: locationBiasFor(data.city),
        includedRegionCodes: ["in"],
      }),
    });
    if (!res.ok) throw new Error(`Places autocomplete failed [${res.status}]: ${await res.text()}`);
    const json = (await res.json()) as {
      suggestions?: { placePrediction?: { placeId: string; text?: { text?: string } } }[];
    };
    return (json.suggestions ?? [])
      .map((s) => s.placePrediction)
      .filter((p): p is { placeId: string; text: { text: string } } => !!p?.placeId && !!p.text?.text)
      .slice(0, 6)
      .map((p) => ({ placeId: p.placeId, text: p.text.text }));
  });

export interface PlaceResult {
  lng: number;
  lat: number;
  label: string;
}

export const getPlaceLocation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ placeId: z.string().min(3).max(200), sessionToken: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<PlaceResult> => {
    const res = await fetch(
      `${placesBase()}/v1/places/${encodeURIComponent(data.placeId)}?sessionToken=${data.sessionToken}`,
      {
        headers: { ...gatewayHeaders(), "X-Goog-FieldMask": "location,formattedAddress,displayName" },
      },
    );
    if (!res.ok) throw new Error(`Place details failed [${res.status}]: ${await res.text()}`);
    const json = (await res.json()) as {
      location?: { latitude: number; longitude: number };
      formattedAddress?: string;
      displayName?: { text?: string };
    };
    if (!json.location) throw new Error("Place has no location");
    return {
      lng: Number(json.location.longitude.toFixed(6)),
      lat: Number(json.location.latitude.toFixed(6)),
      label: json.displayName?.text ?? json.formattedAddress ?? "Selected place",
    };
  });
