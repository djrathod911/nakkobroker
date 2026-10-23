import type { Listing } from "@/data/listings";
import { formatRent } from "@/data/listings";
import { accommodationTypes } from "@/lib/accommodation";

export function SharedAccommodationDetails({ listing }: { listing: Listing }) {
  const d = listing.sharedDetails ?? {};
  const rows = [
    ["Accommodation", accommodationTypes[listing.accommodationType ?? "private_room"]],
    ["Monthly contribution", `${formatRent(listing.rent)}/month`],
    ["Security deposit contribution", formatRent(listing.deposit)],
    ["Maintenance contribution", formatRent(listing.maintenance)],
    ["Utilities", d.utilities_included ? "Included in contribution" : "Shared separately"],
    ...(d.total_flat_rent !== undefined
      ? [["Total flat rent", `${formatRent(d.total_flat_rent)}/month`]]
      : []),
    ["Bathroom", d.bathroom_type ?? "Not specified"],
    ["Existing occupants", String(d.existing_occupants ?? 0)],
    ["Room furniture", d.room_furnishing ?? listing.furnishing],
    ["Storage", d.wardrobe ? "Wardrobe available" : "Not specified"],
  ];
  return (
    <section className="mt-6 space-y-6 border-y border-border py-6">
      <h2 className="text-lg font-semibold">Your room & rent contribution</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="mt-1 font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {!d.utilities_included && (
        <div className="flex flex-wrap gap-4 text-sm">
          {(["electricity", "water", "internet", "other"] as const).map((k) => (
            <span key={k}>
              {k}: {formatRent(d[k] ?? 0)}/month estimated share
            </span>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Rent contributions do not establish a separate lease. Tenant declarations are not legal or
        owner verification.
      </p>
      <div className="space-y-3">
        <h3 className="font-semibold">The household</h3>
        {Object.entries(d)
          .filter(
            ([k, v]) =>
              [
                "introduction",
                "occupation",
                "gender",
                "lifestyle",
                "smoking",
                "food",
                "pets",
                "household",
                "rules",
                "landmarks",
              ].includes(k) && v,
          )
          .map(([k, v]) => (
            <p key={k} className="break-words text-sm">
              <span className="capitalize text-muted-foreground">{k}: </span>
              {String(v)}
            </p>
          ))}
      </div>
    </section>
  );
}
