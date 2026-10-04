import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, ArrowRight } from "lucide-react";
import { CITIES, CITY_INFO, areaNames, areaRate, cityLabel } from "@/lib/cities";
import { SiteFooter } from "@/components/SiteFooter";

const BASE = "https://nakkobroker.com";

function slugToCity(slug: string): string | null {
  const s = slug.toLowerCase();
  return CITIES.find((c) => c.toLowerCase() === s || cityLabel(c).toLowerCase() === s) ?? null;
}

export const Route = createFileRoute("/rentals/$city")({
  beforeLoad: ({ params }) => {
    const city = slugToCity(params.city);
    if (!city) throw notFound();
    return { city };
  },
  loader: ({ context }) => ({ city: context.city }),
  head: ({ loaderData }) => {
    const city = loaderData?.city ?? "Hyderabad";
    const title = `Zero-brokerage rentals in ${city} — NakkoBroker`;
    const description = `Find flats directly from owners in ${city} — ${areaNames(city)
      .slice(0, 4)
      .join(", ")} and more. No brokers, no brokerage, community-verified listings on a live map.`;
    const url = `${BASE}/rentals/${city.toLowerCase()}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: CityPage,
  notFoundComponent: () => (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <h1 className="text-xl font-semibold text-foreground">We don't serve that city yet</h1>
      <p className="text-sm text-muted-foreground">
        NakkoBroker is live in {CITIES.map(cityLabel).join(", ")}.
      </p>
      <Link to="/" className="text-sm text-brand underline-offset-2 hover:underline">
        Back to the map
      </Link>
    </div>
  ),
});

function CityPage() {
  const { city } = Route.useLoaderData();
  const info = CITY_INFO[city]!;
  const areas = areaNames(city);
  const others = CITIES.filter((c) => c !== city);

  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-14">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to map
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Zero-brokerage rentals in {city}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Every home in {city} on NakkoBroker is listed directly by its owner — no brokers, no
          brokerage, no middlemen. Browse live listings on the map, message owners in-app, and book
          a viewing in a tap.
        </p>

        <Link
          to="/"
          search={{ city }}
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-medium text-brand-foreground hover:opacity-90"
        >
          Browse {cityLabel(city)} homes on the map
          <ArrowRight className="size-4" aria-hidden />
        </Link>

        <section aria-labelledby="areas" className="mt-10">
          <h2 id="areas" className="text-lg font-semibold text-foreground">
            Popular localities in {city}
          </h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {areas.map((area) => (
              <li
                key={area}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/60 px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="size-3.5 text-brand" aria-hidden />
                  {area}
                </span>
                <span className="text-xs text-muted-foreground">
                  ~₹{areaRate(city, area)}/sqft
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">
            Typical asking rents per sqft per month, from community listings.
          </p>
        </section>

        <section aria-labelledby="why" className="mt-10">
          <h2 id="why" className="text-lg font-semibold text-foreground">
            Why renters in {city} use NakkoBroker
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Owners list directly — you talk to the person who owns the flat.</li>
            <li>Listings go stale automatically, so you only see homes that are actually available.</li>
            <li>Book viewings, chat, and track rent and repairs in one place.</li>
          </ul>
        </section>

        <section aria-labelledby="other-cities" className="mt-10">
          <h2 id="other-cities" className="text-lg font-semibold text-foreground">
            Also live in
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {others.map((c) => (
              <Link
                key={c}
                to="/rentals/$city"
                params={{ city: c.toLowerCase() }}
                className="rounded-full border border-border/70 bg-card/50 px-3 py-1 text-xs text-muted-foreground hover:border-brand/60 hover:text-foreground"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-10 border-t border-border/60 pt-2">
          <SiteFooter />
        </div>
      </main>
    </div>
  );
}
