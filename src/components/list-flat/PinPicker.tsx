import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";

// Keyless live vector tiles — work on every domain, no API key required.
const STYLES = {
  map: "https://tiles.openfreemap.org/styles/bright",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

const round = (n: number) => Number(n.toFixed(6));

interface PinPickerProps {
  lng: number;
  lat: number;
  onChange: (lng: number, lat: number) => void;
}

export function PinPicker({ lng, lat, onChange }: PinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [style, setStyle] = useState<"map" | "dark">("map");

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ml = await import("maplibre-gl");
        if (cancelled || !containerRef.current) return;
        const map = new ml.Map({
          container: containerRef.current,
          style: STYLES.map,
          center: [lng, lat],
          zoom: 16,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          // Page scroll keeps working; ctrl/⌘ + wheel (or two fingers) zooms
          cooperativeGestures: true,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        map.addControl(
          new ml.GeolocateControl({
            positionOptions: { enableHighAccuracy: true },
            trackUserLocation: false,
          }),
          "top-right",
        );

        const el = document.createElement("div");
        el.setAttribute("aria-label", "Listing location pin");
        el.className =
          "size-7 rounded-full border-[3px] border-white bg-brand shadow-lg shadow-brand/50 cursor-grab active:cursor-grabbing";

        const marker = new ml.Marker({ element: el, draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLngLat();
          onChangeRef.current(round(pos.lng), round(pos.lat));
        });
        map.on("click", (e) => {
          onChangeRef.current(round(e.lngLat.lng), round(e.lngLat.lat));
        });

        mapRef.current = map;
        markerRef.current = marker;
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter whenever the area chip, address search, or pin moves the coordinates
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    const pos = marker.getLngLat();
    if (Math.abs(pos.lng - lng) < 1e-6 && Math.abs(pos.lat - lat) < 1e-6) return;
    marker.setLngLat([lng, lat]);
    map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 16), speed: 1.3 });
  }, [lng, lat]);

  useEffect(() => {
    if (!ready) return;
    mapRef.current?.setStyle(STYLES[style]);
  }, [ready, style]);

  if (failed) {
    return (
      <div className="flex h-64 w-full items-center justify-center rounded-2xl border border-border px-6 text-center">
        <p className="text-xs text-muted-foreground">
          Map unavailable here — use the address search above to set your location.
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border">
      <div ref={containerRef} className="h-72 w-full sm:h-96" />

      <div className="glass absolute left-2 top-2 z-10 flex gap-0.5 rounded-xl p-0.5">
        {(["map", "dark"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStyle(s)}
            aria-pressed={style === s}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors",
              style === s ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "map" ? "Streets" : "Dark"}
          </button>
        ))}
      </div>

      <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/70 px-3 py-1.5 text-center text-[11px] text-muted-foreground backdrop-blur">
        Tap the map or drag the pin to place your flat exactly
      </p>
    </div>
  );
}
