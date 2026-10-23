import { createFileRoute, Link } from "@tanstack/react-router";
import { CityExplorer } from "@/components/listings/CityExplorer";
import { Button } from "@/components/ui/button";
import { fetchListings } from "@/lib/listings.api";
export const Route = createFileRoute("/flatmates")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["listings"], queryFn: fetchListings }),
  head: () => ({
    meta: [
      { title: "Find a Flatmate & Shared Room — NakkoBroker" },
      {
        name: "description",
        content:
          "Find private rooms, shared rooms and beds in Hyderabad, Bengaluru, Chennai, Pune and Vizag. Transparent rent shares, direct messages, zero brokerage.",
      },
      { property: "og:title", content: "Find a Flatmate. Split the Rent. — NakkoBroker" },
      {
        property: "og:description",
        content: "Browse shared accommodation and connect directly with existing tenants.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://nakkobroker.com/flatmates" }],
  }),
  component: () => (
    <main className="min-h-dvh bg-background px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <Button asChild variant="ghost">
          <Link to="/">Back to discovery</Link>
        </Button>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold sm:text-3xl">Find a Flatmate or Shared Room</h1>
            <p className="mt-2 text-muted-foreground">
              Find a place. Share the rent. Zero brokerage.
            </p>
          </div>
          <Button asChild>
            <Link to="/list-your-flat">List a room</Link>
          </Button>
        </div>
        <CityExplorer city="Hyderabad" sharedOnly />
      </div>
    </main>
  ),
});
