import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Map as MLMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { HYDERABAD_CENTER, formatRent, shortRent, type Listing } from "@/data/listings";
import { cn } from "@/lib/utils";

// Keyless live vector tiles — work on every domain, no API key required.
const DARK_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";
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

const round = (n: number) => Number(n.toFixed(6));

interface MapViewProps {
  listings: Listing[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose?: (() => void) | undefined;
  showHeatmap: boolean;
  satellite: boolean;
}

function markerClasses(listing: Listing, isActive: boolean) {
  return cn(
    "cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold tracking-tight transition-all duration-200 outline-none",
    isActive
      ? "bg-brand text-brand-foreground scale-110 shadow-lg shadow-brand/40"
      : listing.availabilityStatus === "occupied"
        ? "bg-warning/20 backdrop-blur text-warning border border-warning/40 hover:scale-105"
        : listing.availabilityStatus === "available_soon"
          ? "bg-blue-500/20 backdrop-blur text-blue-300 border border-blue-500/40 hover:scale-105"
          : "bg-background/80 backdrop-blur text-foreground hover:scale-105 hover:text-teal border border-border",
  );
}

export function MapView({ listings, activeId, onSelect, onClose, showHeatmap, satellite }: MapViewProps) {
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
        if (cancelled || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current,
          style: DARK_STYLE_URL,
          center: HYDERABAD_CENTER,
          zoom: 11,
          attributionControl: { compact: true },
        });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");
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

  // Toggle roadmap/satellite basemap
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    map.setStyle(satellite ? (SATELLITE_STYLE as never) : DARK_STYLE_URL);
  }, [ready, satellite]);

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
      el.textContent = `₹${shortRent(listing.rent)}`;
      el.setAttribute(
        "aria-label",
        `${listing.bhk} BHK in ${listing.area}, ₹${shortRent(listing.rent)}${
          listing.availabilityStatus !== "available"
            ? ` — ${listing.availabilityStatus === "occupied" ? "Occupied" : "Available Soon"}`
            : ""
        }`,
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
    const rent = document.createElement("p");
    rent.className = "mt-1 text-base font-bold";
    rent.textContent = `${formatRent(active.rent)}/mo`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "mt-2 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white";
    btn.textContent = "View details";
    btn.addEventListener("click", () => {
      void navigate({ to: "/listing/$id", params: { id: active.id } });
    });
    node.append(title, meta, rent, btn);

    popupRef.current = new ml.Popup({ closeButton: true, offset: 22, maxWidth: "280px" })
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
