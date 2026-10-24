import type { Listing } from "@/data/listings";
import type { Filters } from "@/components/listings/FilterPanel";
export function matchesListing(l: Listing, f: Filters, query = "") {
  return (
    (l.city ?? "Hyderabad") === f.city &&
    (f.houseType === "Any" || (l.houseType ?? "Flat") === f.houseType) &&
    (!f.accommodationTypes?.length ||
      f.accommodationTypes.includes(l.accommodationType ?? "entire_property")) &&
    (!query || `${l.area} ${l.title} ${l.bhk}bhk`.toLowerCase().includes(query.toLowerCase())) &&
    (!f.locality || l.area.toLowerCase().includes(f.locality.toLowerCase())) &&
    (!f.bhk.length || f.bhk.includes(l.bhk)) &&
    l.rent >= f.minRent &&
    l.rent <= f.maxRent &&
    (!f.ownerOnly || (l.source === "Owner" && (l.creatorRelationship ?? "owner") === "owner")) &&
    (!f.furnishing.length || f.furnishing.includes(l.furnishing)) &&
    f.amenities.every((a) => l.amenities.includes(a)) &&
    (f.availabilityStatus.length
      ? f.availabilityStatus.includes(l.availabilityStatus)
      : (l.listingCategory ?? "entire_property") === "entire_property" ||
        l.availabilityStatus !== "occupied") &&
    (!f.moveInBy ||
      (l.availabilityStatus !== "occupied" &&
        (!l.availableFromDate || l.availableFromDate <= f.moveInBy))) &&
    (!f.bathroomType || l.sharedDetails?.bathroom_type === f.bathroomType) &&
    (!f.preference ||
      Object.entries(l.sharedDetails ?? {})
        .filter(([k]) =>
          [
            "occupation",
            "gender",
            "lifestyle",
            "smoking",
            "food",
            "pets",
            "household",
            "rules",
          ].includes(k),
        )
        .some(([, v]) =>
          String(v)
            .toLowerCase()
            .includes((f.preference ?? "").toLowerCase()),
        ))
  );
}
