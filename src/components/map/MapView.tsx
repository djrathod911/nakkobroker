import { useCallback, useEffect, useRef } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { HYDERABAD_CENTER, shortRent, type Listing } from "@/data/listings";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY =
  (typeof import.meta !== "undefined" && (import.meta.env as Record<string, string>)["VITE_GOOGLE_MAPS_API_KEY"]) ||
  (typeof process !== "undefined" && process.env["VITE_GOOGLE_MAPS_API_KEY"]) ||
  "";

const MAP_CENTER = { lat: HYDERABAD_CENTER[1], lng: HYDERABAD_CENTER[0] };

// Dark map style matching the app's dark theme
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c54" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

interface MapViewProps {
  listings: Listing[];
  activeId: string | null;
  onSelect: (id: string) => void;
  showHeatmap: boolean;
  satellite: boolean;
}

function ListingMarkers({
  listings,
  activeId,
  onSelect,
}: Pick<MapViewProps, "listings" | "activeId" | "onSelect">) {
  const map = useMap();
  const prevActiveRef = useRef<string | null>(null);

  // Fly to active listing
  useEffect(() => {
    if (!map || !activeId || activeId === prevActiveRef.current) return;
    const listing = listings.find((l) => l.id === activeId);
    if (listing) {
      map.panTo({ lat: listing.lat, lng: listing.lng });
      map.setZoom(14);
    }
    prevActiveRef.current = activeId;
  }, [map, activeId, listings]);

  return (
    <>
      {listings.map((listing) => (
        <AdvancedMarker
          key={listing.id}
          position={{ lat: listing.lat, lng: listing.lng }}
          onClick={() => onSelect(listing.id)}
          zIndex={activeId === listing.id ? 10 : 1}
        >
          <button
            type="button"
            aria-label={`${listing.bhk} BHK in ${listing.area}, ₹${shortRent(listing.rent)}`}
            className={cn(
              "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight transition-all duration-200 border-0 outline-none",
              activeId === listing.id
                ? "bg-brand text-brand-foreground scale-110 shadow-lg shadow-brand/40"
                : "bg-background/80 backdrop-blur text-foreground hover:scale-105 hover:text-teal border border-border",
            )}
          >
            ₹{shortRent(listing.rent)}
          </button>
        </AdvancedMarker>
      ))}
    </>
  );
}

export function MapView({ listings, activeId, onSelect, showHeatmap, satellite }: MapViewProps) {
  const mapId = "nakkobroker-map";

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background text-center px-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Map unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Add <code className="rounded bg-secondary px-1">VITE_GOOGLE_MAPS_API_KEY</code> to your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          mapId={mapId}
          defaultCenter={MAP_CENTER}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          mapTypeId={satellite ? "satellite" : "roadmap"}
          styles={satellite ? undefined : DARK_MAP_STYLE}
          reuseMaps
        >
          <ListingMarkers listings={listings} activeId={activeId} onSelect={onSelect} />
        </Map>
      </APIProvider>

      {showHeatmap && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60 mix-blend-screen transition-opacity duration-500"
          style={{
            background:
              "radial-gradient(220px circle at 32% 38%, var(--brand), transparent 70%), radial-gradient(260px circle at 24% 46%, var(--teal), transparent 72%), radial-gradient(200px circle at 56% 40%, var(--warning), transparent 70%)",
            filter: "blur(6px)",
          }}
        />
      )}
    </div>
  );
}
