import type { StyleSpecification } from "maplibre-gl";

// Esri advertises higher levels globally, but those levels return placeholder
// images in our cities. Overzoom level 18 instead of requesting missing imagery.
export const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    esri: {
      type: "raster",
      tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
      tileSize: 256,
      maxzoom: 18,
      attribution: "Imagery © Esri",
    },
  },
  layers: [{ id: "esri", type: "raster", source: "esri" }],
};