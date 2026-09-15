import { useEffect, useRef, useState } from "react";
import type { Map as MLMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface PinPickerProps {
  lng: number;
  lat: number;
  onChange: (lng: number, lat: number) => void;
}

// Keyless live vector tiles — work on every domain, no API key required.
const DARK_STYLE_URL = "https://tiles.openfreemap.org/styles/dark";

const round = (n: number) => Number(n.toFixed(6));

export function PinPicker({ lng, lat, onChange }: PinPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [failed, setFailed] = useState(false);

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
          style: DARK_STYLE_URL,
          center: [lng, lat],
          zoom: 15,
          attributionControl: { compact: true },
        });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "bottom-right");

        const el = document.createElement("div");
        el.setAttribute("aria-label", "Listing location pin");
        el.className = "size-6 rounded-full border-2 border-white bg-brand shadow-lg shadow-brand/40 cursor-grab";

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
    map.panTo([lng, lat]);
  }, [lng, lat]);

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
      <div ref={containerRef} className="h-64 w-full" />
      <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-background/70 px-3 py-1.5 text-center text-[11px] text-muted-foreground backdrop-blur">
        Tap the map or drag the pin to place your flat exactly
      </p>
    </div>
  );
}
