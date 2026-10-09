import { lazy, Suspense, useState } from "react";
import { useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { SlidersHorizontal, Map, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FilterPanel, activeFilterChips, defaultFilters } from "./FilterPanel";
import { ListingCard } from "./ListingCard";
import { fetchListings, fetchMyVotedIds, toggleVote } from "@/lib/listings.api";
import { cityOf } from "@/lib/cities";
import { useAuth } from "@/hooks/useAuth";

const MapView = lazy(() => import("@/components/map/MapView").then((m) => ({ default: m.MapView })));

export function CityExplorer({ city }: { city: string }) {
  const { data: listings } = useSuspenseQuery({ queryKey: ["listings"], queryFn: fetchListings });
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: votedIds = [] } = useQuery({ queryKey: ["my-votes", user?.id], queryFn: () => user ? fetchMyVotedIds(user.id) : Promise.resolve([]), enabled: !!user });
  async function onVote(id: string) {
    if (!user) { await navigate({ to: "/auth", search: { next: `/rentals/${city.toLowerCase()}` } }); return; }
    try {
      await toggleVote(id, user.id, votedIds.includes(id));
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["listings"] }), queryClient.invalidateQueries({ queryKey: ["my-votes", user.id] })]);
    } catch { toast.error("Could not register your vote"); }
  }
  const [filters, setFilters] = useState({ ...defaultFilters, city });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const results = listings.filter((l) =>
    (l.city ?? "Hyderabad") === filters.city &&
    (filters.houseType === "Any" || (l.houseType ?? "Flat") === filters.houseType) &&
    (!filters.bhk.length || filters.bhk.includes(l.bhk)) &&
    l.rent >= filters.minRent && l.rent <= filters.maxRent &&
    (!filters.ownerOnly || l.source === "Owner") &&
    (!filters.furnishing.length || filters.furnishing.includes(l.furnishing)) &&
    filters.amenities.every((a) => l.amenities.includes(a)) &&
    (!filters.availabilityStatus.length || filters.availabilityStatus.includes(l.availabilityStatus)),
  );

  return (
    <section aria-label={`Homes in ${city}`} className="mt-6 min-w-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <h2 className="min-w-0 text-base font-semibold">{results.length} homes in {filters.city}</h2>
        <div className="flex shrink-0 gap-1">
          <Button variant="outline" size="icon" aria-label={view === "list" ? "Show city map" : "Show city listings"} onClick={() => setView(view === "list" ? "map" : "list")}>
            {view === "list" ? <Map /> : <List />}
          </Button>
          <Button variant="outline" onClick={() => setFiltersOpen(true)} aria-label="Filter city homes">
            <SlidersHorizontal /> Filters{activeFilterChips(filters).length ? ` (${activeFilterChips(filters).length})` : ""}
          </Button>
        </div>
      </div>
      <div className="mt-3 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className={view === "map" ? "h-[55dvh] min-h-64 overflow-hidden rounded-lg border border-border lg:sticky lg:top-4" : "hidden h-[55dvh] min-h-64 overflow-hidden rounded-lg border border-border lg:sticky lg:top-4 lg:block"}>
          <Suspense fallback={<div className="h-full bg-muted" />}>
            <MapView listings={results} activeId={activeId} onSelect={setActiveId} onClose={() => setActiveId(null)} showHeatmap={false} basemap="map" center={cityOf(filters.city).center} />
          </Suspense>
        </div>
        <div className={view === "list" ? "min-w-0 space-y-3" : "hidden min-w-0 space-y-3 lg:block"}>
          {results.length ? results.map((listing) => (
            <ListingCard key={listing.id} listing={listing} active={activeId === listing.id} onHover={setActiveId} onSelect={setActiveId} voted={votedIds.includes(listing.id)} onVote={onVote} />
          )) : <div className="py-8 text-center"><p className="text-sm text-muted-foreground">No homes match in {filters.city}.</p><Button variant="ghost" className="mt-2" onClick={() => setFilters({ ...defaultFilters, city: filters.city })}>Reset filters</Button></div>}
        </div>
      </div>
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent className="flex w-full max-w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-border p-4 pr-12 text-left"><SheetTitle>Filter city homes</SheetTitle></SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4"><FilterPanel filters={filters} onChange={setFilters} /></div>
          <div className="shrink-0 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"><Button className="min-h-11 w-full" onClick={() => setFiltersOpen(false)}>Show {results.length} homes</Button></div>
        </SheetContent>
      </Sheet>
    </section>
  );
}