import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, type MapProps } from "@vis.gl/react-google-maps";

interface PinPickerProps {
  lng: number;
  lat: number;
  onChange: (lng: number, lat: number) => void;
}

const env = (typeof import.meta !== "undefined" ? (import.meta.env as Record<string, string>) : {}) ?? {};
const GOOGLE_MAPS_API_KEY =
  env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] ||
  env["VITE_GOOGLE_MAPS_API_KEY"] ||
  (typeof process !== "undefined" && process.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"]) ||
  (typeof process !== "undefined" && process.env["VITE_GOOGLE_MAPS_API_KEY"]) ||
  "";

const DARK_MAP_STYLE: NonNullable<MapProps["styles"]> = [
  { elementType: "geometry", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#16213e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c54" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
];

const round = (n: number) => Number(n.toFixed(6));

function PinLayer({ lng, lat, onChange }: PinPickerProps) {
  const map = useMap();

  // Recenter whenever the area chip (or pin) changes the coordinates
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat, lng });
  }, [map, lat, lng]);

  useEffect(() => {
    if (!map) return;
    const listener = map.addListener("click", (e: { latLng?: { lat(): number; lng(): number } | null }) => {
      if (!e.latLng) return;
      onChange(round(e.latLng.lng()), round(e.latLng.lat()));
    });
    return () => listener.remove();
  }, [map, onChange]);

  return (
    <AdvancedMarker
      position={{ lat, lng }}
      draggable
      onDragEnd={(e) => {
        if (!e.latLng) return;
        onChange(round(e.latLng.lng), round(e.latLng.lat));
      }}
    >
      <div
        aria-label="Listing location pin"
        className="size-6 rounded-full border-2 border-white bg-brand shadow-lg shadow-brand/40"
      />
    </AdvancedMarker>
  );
}

export function PinPicker({ lng, lat, onChange }: PinPickerProps) {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border text-xs text-muted-foreground">
        Map unavailable
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <div className="h-64 w-full">
        <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
          <Map
            mapId="nakkobroker-pin"
            defaultCenter={{ lat, lng }}
            defaultZoom={15}
            gestureHandling="greedy"
            disableDefaultUI={false}
            mapTypeControl={false}
            streetViewControl={false}
            fullscreenControl={false}
            styles={DARK_MAP_STYLE}
            clickableIcons={false}
            reuseMaps
          >
            <PinLayer lng={lng} lat={lat} onChange={onChange} />
          </Map>
        </APIProvider>
      </div>
      <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/70 px-3 py-1.5 text-center text-[11px] text-muted-foreground backdrop-blur">
        Tap the map or drag the pin to place your flat exactly
      </p>
    </div>
  );
}
