import { describe, expect, it } from "vitest";
import { localityFromAddress, movedListingPin, selectedListingLocation } from "./listing-location";
import { emptyDraft, stepSchemas, loadDraftState, saveDraft, clearDraft } from "./list-flat";

describe("listing location consistency", () => {
  it("selects Boduppal together with its pin instead of retaining Madhapur", () => {
    const selected = selectedListingLocation("Hyderabad", { area: "Boduppal", lng: 78.5783, lat: 17.4139 });
    const draft = { ...emptyDraft, ...selected };
    expect(draft.area).toBe("Boduppal");
    expect(draft.lng).toBe(78.5783);
    expect(draft.lat).toBe(17.4139);
    expect(stepSchemas[0]?.safeParse(draft).success).toBe(true);
  });

  it("uses the neighbourhood rather than a landmark name", () => {
    expect(localityFromAddress([
      { longText: "Hyderabad", types: ["locality"] },
      { longText: "Boduppal", types: ["sublocality_level_1", "sublocality"] },
    ], "Ambedkar statue")).toBe("Boduppal");
  });

  it("requires a new locality after moving the pin", () => {
    const draft = { ...emptyDraft, ...movedListingPin(78.5783, 17.4139) };
    expect(draft.area).toBe("");
    expect(stepSchemas[0]?.safeParse(draft).success).toBe(false);
    expect(stepSchemas[0]?.safeParse({ ...draft, area: "Boduppal" }).success).toBe(true);
  });

  it("rejects an address outside the selected city", () => {
    expect(() => selectedListingLocation("Pune", { area: "Boduppal", lng: 78.5783, lat: 17.4139 })).toThrow("outside Pune");
  });
});