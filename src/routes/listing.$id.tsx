import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowBigUp,
  BadgeCheck,
  Building2,
  TrainFront,
  Share2,
  Phone,
  AlertTriangle,
  ImageOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapView } from "@/components/map/MapView";
import { formatRent } from "@/data/listings";
import {
  fetchContactPhone,
  fetchListingById,
  fetchMyVotedIds,
  signedPhotoUrls,
  toggleVote,
} from "@/lib/listings.api";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/listing/$id")({
  loader: ({ params }) => fetchListingById(params.id),
  head: ({ params, loaderData }) => {
    const url = `https://nakkobroker.com/listing/${params.id}`;
    if (!loaderData) {
      return {
        meta: [
          { title: "Listing unavailable — NakkoBroker" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const l = loaderData;
    const city = l.city ?? "Hyderabad";
    const kind = l.houseType ?? "Flat";
    const title = `${l.bhk} BHK ${kind} in ${l.area}, ${city} — ₹${l.rent.toLocaleString("en-IN")}/mo`;
    const description = `${l.title} in ${l.area}, ${city}. ${l.sqft} sqft, ${l.furnishing}, deposit ₹${l.deposit.toLocaleString("en-IN")}. Zero brokerage, listed directly by the owner.`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: l.title,
            description,
            url,
            datePosted: new Date(Date.now() - l.postedDaysAgo * 86_400_000).toISOString(),
            numberOfRooms: l.bhk,
            floorSize: { "@type": "QuantitativeValue", value: l.sqft, unitCode: "FTK" },
            address: {
              "@type": "PostalAddress",
              addressLocality: l.area,
              addressRegion: city,
              addressCountry: "IN",
            },

            offers: {
              "@type": "Offer",
              price: l.rent,
              priceCurrency: "INR",
              availability: "https://schema.org/InStock",
            },
          }),
        },
      ],
    };
  },
  component: ListingDetailPage,
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold">{value}</p>
    </div>
  );
}

function ListingDetailPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showPhone, setShowPhone] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ["listing", id],
    queryFn: () => fetchListingById(id),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["listing-photos", id, listing?.photoPaths],
    queryFn: () => signedPhotoUrls(listing?.photoPaths ?? []),
    enabled: !!listing?.photoPaths.length,
  });

  const { data: votedIds = [] } = useQuery({
    queryKey: ["my-votes", user?.id],
    queryFn: () => fetchMyVotedIds(user!.id),
    enabled: !!user,
  });

  const { data: contactPhone = null } = useQuery({
    queryKey: ["listing-phone", id, user?.id],
    queryFn: () => fetchContactPhone(id),
    enabled: !!user,
  });


  const voted = votedIds.includes(id);

  async function onVote() {
    if (!user) {
      toast("Sign in to upvote listings");
      navigate({ to: "/auth" });
      return;
    }
    try {
      await toggleVote(id, user.id, voted);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listing", id] }),
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["my-votes", user.id] }),
      ]);
    } catch {
      toast.error("Could not register your vote");
    }
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ url, title: listing?.title ?? "NakkoBroker" });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user dismissed */
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading listing…</p>
      </main>
    );
  }

  if (!listing) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-2xl font-semibold">Listing not available</h1>
        <p className="text-sm text-muted-foreground">
          It may have been unpublished or removed by the owner.
        </p>
        <Button asChild className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90">
          <Link to="/">Back to the map</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="rounded-2xl">
            <Link to="/">
              <ArrowLeft className="size-4" /> Back to map
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="glass rounded-2xl border-0"
              onClick={onVote}
              aria-pressed={voted}
            >
              <ArrowBigUp className="size-4" /> {listing.votes}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="glass rounded-2xl border-0"
              aria-label="Share listing"
              onClick={onShare}
            >
              <Share2 className="size-4" />
            </Button>
          </div>
        </div>

        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mt-4"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="rounded-full bg-accent text-accent-foreground">{listing.bhk} BHK</Badge>
            <Badge variant="outline" className="rounded-full border-border text-muted-foreground">
              {listing.houseType ?? "Flat"}
            </Badge>
            <Badge variant="outline" className="rounded-full border-border text-muted-foreground">
              {listing.furnishing}
            </Badge>
            {listing.source === "To-Let Board" && (
              <Badge className="rounded-full bg-teal/15 text-teal">Board spotted</Badge>
            )}
            {listing.ownerVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                <BadgeCheck className="size-3.5" aria-hidden /> Owner verified
              </span>
            )}
            {listing.suspiciousPrice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
                <AlertTriangle className="size-3.5" aria-hidden /> Price looks off
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{listing.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {listing.area}, {listing.city ?? "Hyderabad"} · {listing.sqft} sqft · posted{" "}
            {listing.postedDaysAgo}d ago
          </p>
        </motion.header>

        <section className="mt-6" aria-label="Photos">
          {photos.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {photos.map((src, i) => (
                <img
                  key={src}
                  src={src}
                  alt={`${listing.bhk} BHK in ${listing.area} — photo ${i + 1}`}
                  loading="lazy"
                  className="h-56 w-full rounded-2xl object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="glass flex h-40 items-center justify-center gap-2 rounded-2xl text-sm text-muted-foreground">
              <ImageOff className="size-4" aria-hidden /> No photos shared yet
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Monthly rent" value={`${formatRent(listing.rent)}${listing.negotiable ? " · neg." : ""}`} />
          <Stat label="Deposit" value={formatRent(listing.deposit)} />
          <Stat label="Maintenance" value={listing.maintenance ? formatRent(listing.maintenance) : "None"} />
          <Stat label="Available" value={listing.availableFrom} />
        </section>

        {listing.description ? (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              About this home
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/90">
              {listing.description}
            </p>
          </section>
        ) : null}

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Home details">
          <Stat label="Bathrooms" value={String(listing.bathrooms ?? 1)} />
          <Stat label="Balconies" value={String(listing.balconies ?? 0)} />
          <Stat
            label="Floor"
            value={
              listing.totalFloors
                ? `${listing.floor ?? 0} of ${listing.totalFloors}`
                : String(listing.floor ?? 0)
            }
          />
          <Stat label="Parking" value={listing.parking ?? "None"} />
        </section>


        <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Amenities
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {listing.amenities.length ? (
                  listing.amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs"
                    >
                      {a}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Not specified</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <TrainFront className="size-4" aria-hidden /> {listing.metroKm} km to metro
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-4" aria-hidden /> {listing.itCorridorKm} km to IT corridor
              </span>
              <span>Preferred tenant: {listing.tenant}</span>
            </div>

            <div className="glass rounded-2xl p-4">
              <h2 className="text-sm font-semibold">Contact the owner</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Zero brokerage — you talk to the owner directly.
              </p>
              {!user ? (
                <Button
                  asChild
                  className="mt-3 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  <Link to="/auth" search={{ next: `/listing/${listing.id}` }}>
                    Sign in to view contact
                  </Link>

                </Button>
              ) : contactPhone ? (
                showPhone ? (
                  <a
                    href={`tel:${contactPhone}`}
                    className="mt-3 inline-flex items-center gap-2 text-lg font-semibold text-teal"
                  >
                    <Phone className="size-4" aria-hidden /> {contactPhone}
                  </a>

                ) : (
                  <Button
                    className="mt-3 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
                    onClick={() => setShowPhone(true)}
                  >
                    <Phone className="size-4" /> Reveal phone number
                  </Button>
                )
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  No phone shared. Upvote so the community can request contact details.
                </p>
              )}
            </div>
          </div>

          <div className="h-80 overflow-hidden rounded-2xl border border-border lg:h-full">
            <MapView
              listings={[listing]}
              activeId={listing.id}
              onSelect={() => {}}
              showHeatmap={false}
              satellite={false}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
