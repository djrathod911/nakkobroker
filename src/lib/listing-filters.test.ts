import { it, expect } from "vitest";
import { matchesListing } from "./listing-filters";
import { defaultFilters } from "@/components/listings/FilterPanel";
import type { Listing } from "@/data/listings";
const room: Listing = {
  id: "room",
  title: "Private room",
  area: "Madhapur",
  city: "Hyderabad",
  bhk: 2,
  rent: 15000,
  deposit: 30000,
  maintenance: 0,
  negotiable: false,
  furnishing: "Fully Furnished",
  tenant: "Anyone",
  ownerVerified: false,
  communityVerified: false,
  metroKm: 0,
  itCorridorKm: 0,
  sqft: 0,
  availableFrom: "Immediate",
  availabilityStatus: "available",
  mapVisible: true,
  postedDaysAgo: 0,
  amenities: ["Lift"],
  votes: 0,
  lng: 78.4,
  lat: 17.4,
  source: "Owner",
  listingCategory: "flatmate",
  accommodationType: "private_room",
  creatorRelationship: "tenant",
  sharedDetails: { bathroom_type: "Shared", total_flat_rent: 30000 },
};
it("filters rooms using incoming 15000 contribution, not 30000 total", () => {
  expect(matchesListing(room, { ...defaultFilters, maxRent: 15000 })).toBe(true);
  expect(matchesListing(room, { ...defaultFilters, maxRent: 14999 })).toBe(false);
});
it("excludes occupied accommodation unless explicitly requested", () => {
  expect(matchesListing({ ...room, availabilityStatus: "occupied" }, defaultFilters)).toBe(false);
  expect(
    matchesListing(
      { ...room, availabilityStatus: "occupied" },
      { ...defaultFilters, availabilityStatus: ["occupied"] },
    ),
  ).toBe(true);
});
it("keeps occupied whole flats discoverable by default", () => {
  const flat: Listing = {
    ...room,
    listingCategory: "entire_property",
    accommodationType: "entire_property",
    creatorRelationship: "owner",
    availabilityStatus: "occupied",
  };
  expect(matchesListing(flat, defaultFilters)).toBe(true);
  const legacyFlat = { ...flat };
  delete legacyFlat.listingCategory;
  expect(matchesListing(legacyFlat, defaultFilters)).toBe(true);
});
it("respects explicit availability filters for occupied whole flats", () => {
  const flat: Listing = {
    ...room,
    listingCategory: "entire_property",
    availabilityStatus: "occupied",
  };
  expect(matchesListing(flat, { ...defaultFilters, availabilityStatus: ["available"] })).toBe(
    false,
  );
  expect(matchesListing(flat, { ...defaultFilters, availabilityStatus: ["occupied"] })).toBe(true);
});
it("keeps occupied room and bed offers hidden by default", () => {
  for (const accommodationType of ["private_room", "shared_room", "bed"] as const) {
    expect(
      matchesListing(
        { ...room, listingCategory: "room_bed", accommodationType, availabilityStatus: "occupied" },
        defaultFilters,
      ),
    ).toBe(false);
  }
});
it("combines room, locality, bathroom, budget and move-in filters", () => {
  const f = {
    ...defaultFilters,
    accommodationTypes: ["private_room"],
    locality: "Madhapur",
    bathroomType: "Shared",
    moveInBy: "2026-11-01",
    maxRent: 15000,
  };
  expect(matchesListing(room, f)).toBe(true);
  expect(matchesListing(room, { ...f, bathroomType: "Attached" })).toBe(false);
});
it("does not treat tenant-created rooms as direct owner properties", () => {
  expect(matchesListing(room, { ...defaultFilters, ownerOnly: true })).toBe(false);
});
