import { createFileRoute } from "@tanstack/react-router";
import { AccommodationWizard } from "@/components/listings/AccommodationWizard";

export const Route = createFileRoute("/_authenticated/list-accommodation")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { category: "flatmate" | "room_bed"; edit?: string } => ({
    category: s["category"] === "room_bed" ? "room_bed" : "flatmate",
    ...(typeof s["edit"] === "string" ? { edit: s["edit"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "List a room or find a flatmate — NakkoBroker" },
      {
        name: "description",
        content:
          "Offer a private room, shared room or bed. Set a transparent rent contribution and connect directly, with zero brokerage.",
      },
      { property: "og:title", content: "Find a flatmate — NakkoBroker" },
      {
        property: "og:description",
        content: "List shared accommodation with transparent contribution pricing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => {
    const s = Route.useSearch();
    return <AccommodationWizard key={s.edit ?? s.category} category={s.category} editId={s.edit} />;
  },
});
