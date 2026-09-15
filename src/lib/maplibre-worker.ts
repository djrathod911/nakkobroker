// MapLibre resolves its worker relative to its own bundled chunk
// (/assets/maplibre-gl-worker.mjs), which Vite/Rollup never emits — in
// production that 404s and the map renders as an empty grey canvas.
// Bundling the worker ourselves and pointing MapLibre at it fixes that.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

let configured = false;

export async function ensureMaplibreWorker(ml: typeof import("maplibre-gl")) {
  if (configured) return;
  configured = true;
  try {
    ml.setWorkerUrl(workerUrl);
  } catch {
    // Older builds without setWorkerUrl fall back to the default resolution.
  }
}
