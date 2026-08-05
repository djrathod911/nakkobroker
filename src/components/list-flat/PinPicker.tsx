import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, Marker, StyleSpecification } from "maplibre-gl";

interface PinPickerProps {
  lng: number;
  lat: number;
  onChange: (lng: number, lat: number) => void;
}

const style: StyleSpecification = {
  version: 8,
  sources: {
    base: {
      type: "raster",
      tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap, © CARTO",
    },
  },
  layers: [{ id: "base", type: "raster", source: "base" }],
};

export function PinPicker({ lng, lat, onChange }: PinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const changeRef = useRef(onChange);
  changeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: [lng, lat],
      zoom: 14,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    const el = document.createElement("div");
    el.className = "size-6 rounded-full border-2 border-white bg-brand shadow-lg";
    el.setAttribute("aria-label", "Listing location pin");

    const marker = new maplibregl.Marker({ element: el, draggable: true }).setLngLat([lng, lat]).addTo(map);
    marker.on("dragend", () => {
      const p = marker.getLngLat();
      changeRef.current(Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6)));
    });
    map.on("click", (e) => {
      marker.setLngLat(e.lngLat);
      changeRef.current(Number(e.lngLat.lng.toFixed(6)), Number(e.lngLat.lat.toFixed(6)));
    });

    mapRef.current = map;
    markerRef.current = marker;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const marker = markerRef.current;
    const map = mapRef.current;
    if (!marker || !map) return;
    const cur = marker.getLngLat();
    if (Math.abs(cur.lng - lng) < 1e-6 && Math.abs(cur.lat - lat) < 1e-6) return;
    marker.setLngLat([lng, lat]);
    map.easeTo({ center: [lng, lat], duration: 500 });
  }, [lng, lat]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <div ref={containerRef} className="h-64 w-full" />
      <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/70 px-3 py-1.5 text-center text-[11px] text-muted-foreground backdrop-blur">
        Tap the map or drag the pin to place your flat exactly
      </p>
    </div>
  );
}
