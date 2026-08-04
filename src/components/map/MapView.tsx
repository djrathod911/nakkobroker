import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";
import { HYDERABAD_CENTER, shortRent, type Listing } from "@/data/listings";

interface MapViewProps {
  listings: Listing[];
  activeId: string | null;
  onSelect: (id: string) => void;
  showHeatmap: boolean;
  satellite: boolean;
}

const RASTER_TILES = {
  dark: "https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
  satellite: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
};

function styleFor(satellite: boolean): StyleSpecification {
  return {
    version: 8,
    sources: {
      base: {
        type: "raster",
        tiles: [satellite ? RASTER_TILES.satellite : RASTER_TILES.dark],
        tileSize: 256,
        attribution: satellite ? "© Esri" : "© OpenStreetMap, © CARTO",
      },
    },
    layers: [{ id: "base", type: "raster", source: "base" }],
  };
}

export function MapView({ listings, activeId, onSelect, showHeatmap, satellite }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: styleFor(false),
      center: HYDERABAD_CENTER,
      zoom: 11.2,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    mapRef.current?.setStyle(styleFor(satellite));
  }, [satellite]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const markers = markersRef.current;

    for (const [id, marker] of markers) {
      if (!listings.some((l) => l.id === id)) {
        marker.remove();
        markers.delete(id);
      }
    }

    for (const listing of listings) {
      let marker: Marker | undefined = markers.get(listing.id);
      if (!marker) {
        const el = document.createElement("button");
        el.type = "button";
        el.setAttribute("aria-label", `${listing.bhk} BHK in ${listing.area}`);
        el.dataset["pin"] = listing.id;
        el.addEventListener("click", () => onSelect(listing.id));
        marker = new maplibregl.Marker({ element: el }).setLngLat([listing.lng, listing.lat]).addTo(map);
        markers.set(listing.id, marker);
      }
      const el = marker!.getElement();
      const active = activeId === listing.id;
      el.className = [
        "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight transition-all duration-200",
        active
          ? "bg-brand text-brand-foreground scale-110 glow-ring"
          : "glass text-foreground hover:scale-105 hover:text-teal",
      ].join(" ");
      el.textContent = `₹${shortRent(listing.rent)}`;
    }
  }, [listings, activeId, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeId) return;
    const listing = listings.find((l) => l.id === activeId);
    if (listing) map.flyTo({ center: [listing.lng, listing.lat], zoom: 13.5, speed: 0.9 });
  }, [activeId, listings]);

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />
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
