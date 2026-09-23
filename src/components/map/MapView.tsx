import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Map as MLMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  HYDERABAD_CENTER,
  availabilityStatusLabel,
  formatRent,
  shortRent,
  type Listing,
} from "@/data/listings";
import { cn } from "@/lib/utils";
import { ensureMaplibreWorker } from "@/lib/maplibre-worker";

// Keyless live vector tiles — work on every domain, no API key required.
const STYLES = {
  map: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const SATELLITE_STYLE = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      attribution: "Imagery © Esri",
    },
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
} as const;

export type Basemap = "map" | "dark" | "satellite";

const round = (n: number) => Number(n.toFixed(6));

interface MapViewProps {
  listings: Listing[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (() => void) | undefined;
  showHeatmap: boolean;
  basemap: Basemap;
  /** Centre of the selected city — used before any homes are listed there. */
  center?: [number, number];
}

function markerClasses(listing: Listing, isActive: boolean) {
  return cn(
    // Bigger tap target (44px tall hit area via py) + clearer contrast
    "cursor-pointer select-none whitespace-nowrap rounded-full px-3.5 py-2 text-[12px] font-bold leading-none tracking-normal",
    "shadow-lg ring-1 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-brand",
    isActive
      ? "bg-brand text-brand-foreground ring-brand/50 scale-110 z-10 shadow-brand/40"
      : listing.availabilityStatus === "occupied"
        ? "bg-card/95 text-warning ring-warning/50 backdrop-blur hover:scale-110"
        : listing.availabilityStatus === "available_soon"
          ? "bg-card/95 text-blue-400 ring-blue-400/50 backdrop-blur hover:scale-110"
          : "bg-card/95 text-foreground ring-border backdrop-blur hover:scale-110 hover:text-brand",
  );
}

export function MapView({ listings, activeId, onSelect, onClose, showHeatmap, basemap }: MapViewProps) {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const mlRef = useRef<typeof import("maplibre-gl") | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  // Keep latest callbacks in refs so map listeners never go stale
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // Init the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        await ensureMaplibreWorker(ml);
        if (cancelled || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current,
          style: STYLES.map,
          center: HYDERABAD_CENTER,
          zoom: 11,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,

        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
        map.addControl(
          new ml.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false,
            showAccuracyCircle: true,
          }),
          "bottom-right",
        );
        map.on("load", () => {
          if (cancelled) return;
          mlRef.current = ml;
          mapRef.current = map;
          setReady(true);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Swap basemap: bright streets / dark / satellite
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setStyle(basemap === "satellite" ? (SATELLITE_STYLE as never) : STYLES[basemap]);
  }, [ready, basemap]);

  // Render listing markers
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!ready || !map || !ml) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = listings.map((listing) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = markerClasses(listing, listing.id === activeId);
      const status = availabilityStatusLabel(listing.availabilityStatus);
      el.textContent = `₹${shortRent(listing.rent)} · ${status}`;
      el.setAttribute(
        "aria-label",
        `${listing.bhk} BHK in ${listing.area}, ₹${shortRent(listing.rent)} — ${status}`,
      );
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectRef.current(listing.id);
      });
      return new ml.Marker({ element: el })
        .setLngLat([round(listing.lng), round(listing.lat)])
        .addTo(map);
    });
  }, [ready, listings, activeId]);

  // Keep every result in view when the list changes
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!ready || !map || !ml || listings.length === 0 || activeId) return;
    const bounds = new ml.LngLatBounds();
    listings.forEach((l) => bounds.extend([l.lng, l.lat]));
    map.fitBounds(bounds, {
      padding: { top: 120, bottom: 120, left: 60, right: 60 },
      maxZoom: 14,
      duration: 700,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, listings]);

  // Active listing popup + fly-to
  useEffect(() => {
    const map = mapRef.current;
    const ml = mlRef.current;
    if (!ready || !map || !ml) return;

    popupRef.current?.remove();
    popupRef.current = null;
    if (!activeId) return;

    const active = listings.find((l) => l.id === activeId);
    if (!active) return;

    map.flyTo({ center: [active.lng, active.lat], zoom: 14, speed: 1.4 });

    const node = document.createElement("div");
    node.className = "min-w-[210px] max-w-[250px] p-1";
    const title = document.createElement("p");
    title.className = "text-sm font-semibold leading-snug";
    title.textContent = active.title;
    const meta = document.createElement("p");
    meta.className = "mt-0.5 text-xs opacity-70";
    meta.textContent = `${active.bhk} BHK · ${active.furnishing} · ${active.area}`;
    const status = document.createElement("p");
    status.className = "mt-1 text-xs font-semibold";
    status.textContent = availabilityStatusLabel(active.availabilityStatus);
    const rent = document.createElement("p");
    rent.className = "mt-1 text-base font-bold";
    rent.textContent = `${formatRent(active.rent)}/mo`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "mt-2 inline-flex w-full items-center justify-center rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-brand-foreground";
    btn.textContent = "View details";
    btn.addEventListener("click", () => {
      void navigate({ to: "/listing/$id", params: { id: active.id } });
    });
    node.append(title, meta, status, rent, btn);

    popupRef.current = new ml.Popup({
      closeButton: true,
      offset: 22,
      maxWidth: "280px",
      className: "listing-map-popup",
    })
      .setLngLat([active.lng, active.lat])
      .setDOMContent(node)
      .addTo(map);
    popupRef.current.on("close", () => onCloseRef.current?.());
  }, [ready, activeId, listings, navigate]);

  if (failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-background px-6 text-center">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Map unavailable right now</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse the homes listed below — they all still work.
          </p>
        </div>
      </div>
    );
  }

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
