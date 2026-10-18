import { describe, expect, it } from "vitest";
import { SATELLITE_STYLE } from "./satellite-style";

describe("satellite imagery coverage", () => {
  it("overzooms available imagery rather than requesting unavailable higher levels", () => {
    const source = SATELLITE_STYLE.sources["esri"];
    expect(source?.type).toBe("raster");
    if (!source || source.type !== "raster") throw new Error("Missing raster source");
    expect(source.maxzoom).toBe(18);
    expect(source.tileSize).toBe(256);
  });
});