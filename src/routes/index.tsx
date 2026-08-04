import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Search,
  SlidersHorizontal,
  Flame,
  Satellite,
  Layers,
  Camera,
  Plus,
  Sparkles,
  TrendingUp,
  TrendingDown,
  LogOut,
  X,
} from "lucide-react";
import { MapView } from "@/components/map/MapView";
import { ListingCard } from "@/components/listings/ListingCard";
import { FilterPanel, defaultFilters, type Filters } from "@/components/listings/FilterPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { trendingAreas, formatRent } from "@/data/listings";
import { fetchListings, fetchMyVotedIds, toggleVote } from "@/lib/listings.api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const TITLE = "NakkoBroker — Zero-brokerage rentals in Hyderabad";
const DESCRIPTION =
  "Discover Hyderabad flats directly from owners on a live map. No brokers, no brokerage — community-verified listings and To-Let boards.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState(false);
  const [satellite, setSatellite] = useState(false);
  const [showTrending, setShowTrending] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: allListings = [] } = useQuery({
    queryKey: ["listings"],
    queryFn: fetchListings,
  });

  const { data: votedIds = [] } = useQuery({
    queryKey: ["my-votes", user?.id],
    queryFn: () => fetchMyVotedIds(user!.id),
    enabled: !!user,
  });

  async function onVote(listingId: string) {
    if (!user) {
      toast("Sign in to upvote listings");
      navigate({ to: "/auth" });
      return;
    }
    try {
      await toggleVote(listingId, user.id, votedIds.includes(listingId));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
        queryClient.invalidateQueries({ queryKey: ["my-votes", user.id] }),
      ]);
    } catch {
      toast.error("Could not register your vote");
    }
  }

  async function onSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allListings.filter((l) => {
      if (q && !`${l.area} ${l.title} ${l.bhk}bhk`.toLowerCase().includes(q)) return false;
      if (filters.bhk.length && !filters.bhk.includes(l.bhk)) return false;
      if (l.rent > filters.maxRent) return false;
      if (filters.ownerOnly && l.source !== "Owner") return false;
      if (filters.furnishing.length && !filters.furnishing.includes(l.furnishing)) return false;
      if (filters.amenities.length && !filters.amenities.every((a) => l.amenities.includes(a))) return false;
      return true;
    });
  }, [query, filters, allListings]);

  const avgRent = results.length
    ? Math.round(results.reduce((sum, l) => sum + l.rent, 0) / results.length)
    : 0;

  const activeFilterCount =
    filters.bhk.length +
    filters.furnishing.length +
    filters.amenities.length +
    (filters.ownerOnly ? 1 : 0) +
    (filters.maxRent < 130000 ? 1 : 0);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <div className="absolute inset-0">
        <MapView
          listings={results}
          activeId={activeId}
          onSelect={setActiveId}
          showHeatmap={heatmap}
          satellite={satellite}
        />
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-5">
        <div className="pointer-events-auto mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="glass flex min-w-0 items-center gap-2 rounded-2xl px-3 py-2">
            <span className="hidden shrink-0 items-center gap-2 pr-2 sm:flex">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand text-xs font-black text-brand-foreground">
                N
              </span>
              <span className="text-sm font-semibold tracking-tight">NakkoBroker</span>
            </span>
            <div className="hidden h-6 w-px shrink-0 bg-border sm:block" />
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Madhapur, Gachibowli, metro, society…"
              aria-label="Search areas and listings"
              className="min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            {query && (
              <Button
                size="icon"
                variant="ghost"
                aria-label="Clear search"
                className="size-7 shrink-0 rounded-full"
                onClick={() => setQuery("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="secondary" className="glass rounded-2xl border-0">
                  <SlidersHorizontal className="size-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <span className="ml-1 rounded-full bg-brand px-1.5 text-xs text-brand-foreground">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full border-border bg-card/95 backdrop-blur-xl sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Refine your search</SheetTitle>
                </SheetHeader>
                <div className="overflow-y-auto px-4 pb-8">
                  <FilterPanel filters={filters} onChange={setFilters} />
                  <Button variant="ghost" className="mt-5 w-full" onClick={() => setFilters(defaultFilters)}>
                    Reset all
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            <Button asChild className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to={user ? "/list-your-flat" : "/auth"}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">List your flat</span>
              </Link>
            </Button>
            {user ? (
              <Button
                variant="secondary"
                size="icon"
                className="glass rounded-2xl border-0"
                aria-label="Sign out"
                onClick={onSignOut}
              >
                <LogOut className="size-4" />
              </Button>
            ) : (
              <Button asChild variant="secondary" className="glass rounded-2xl border-0">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Map layer controls */}
      <div className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 sm:block">
        <div className="glass flex flex-col gap-1 rounded-2xl p-1.5">
          <LayerButton icon={Flame} label="Price heatmap" active={heatmap} onClick={() => setHeatmap((v) => !v)} />
          <LayerButton
            icon={Satellite}
            label="Satellite"
            active={satellite}
            onClick={() => setSatellite((v) => !v)}
          />
          <LayerButton
            icon={Layers}
            label="Trending areas"
            active={showTrending}
            onClick={() => setShowTrending((v) => !v)}
          />
          <LayerButton icon={Camera} label="Spot a To-Let board" active={false} onClick={() => {}} />
        </div>
      </div>

      {/* Trending strip */}
      <AnimatePresence>
        {showTrending && (
          <motion.aside
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute left-1/2 top-24 z-10 hidden -translate-x-1/2 lg:block"
          >
            <div className="glass flex items-center gap-4 rounded-2xl px-4 py-2.5">
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="size-3.5 text-teal" aria-hidden /> Trending
              </span>
              {trendingAreas.map((a) => (
                <span key={a.name} className="flex shrink-0 items-center gap-1.5 text-xs">
                  <span className="font-medium">{a.name}</span>
                  <span className="text-muted-foreground">{formatRent(a.avgRent)}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5",
                      a.change >= 0 ? "text-success" : "text-teal",
                    )}
                  >
                    {a.change >= 0 ? (
                      <TrendingUp className="size-3" aria-hidden />
                    ) : (
                      <TrendingDown className="size-3" aria-hidden />
                    )}
                    {Math.abs(a.change)}%
                  </span>
                </span>
              ))}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Results panel */}
      <section
        aria-label="Search results"
        className="absolute inset-x-0 bottom-0 z-20 max-h-[52dvh] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[400px] sm:p-5 sm:pt-24"
      >
        <div className="glass flex h-full flex-col rounded-t-3xl sm:rounded-3xl">
          <div className="shrink-0 border-b border-border/60 px-4 py-3">
            <h1 className="text-sm font-semibold tracking-tight">
              {results.length} zero-brokerage {results.length === 1 ? "home" : "homes"} in Hyderabad
            </h1>
            <p className="text-xs text-muted-foreground">
              {avgRent ? `Average ${formatRent(avgRent)}/month in this view` : "Adjust filters to see homes"}
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {results.length === 0 ? (
              <div className="grid h-full place-items-center px-6 text-center">
                <div>
                  <p className="text-sm font-medium">No homes match yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Widen your budget or clear a few filters to see more of Hyderabad.
                  </p>
                  <Button variant="secondary" className="mt-4" onClick={() => setFilters(defaultFilters)}>
                    Reset filters
                  </Button>
                </div>
              </div>
            ) : (
              results.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  active={activeId === listing.id}
                  onHover={setActiveId}
                  onSelect={setActiveId}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function LayerButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Flame;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-10 place-items-center rounded-xl transition-all duration-200",
        active ? "bg-brand text-brand-foreground glow-ring" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
