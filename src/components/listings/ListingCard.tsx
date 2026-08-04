import { motion } from "framer-motion";
import {
  BadgeCheck,
  ArrowBigUp,
  Share2,
  Users,
  AlertTriangle,
  TrainFront,
  Building2,
} from "lucide-react";
import { formatRent, type Listing } from "@/data/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ListingCardProps {
  listing: Listing;
  active: boolean;
  onHover: (id: string) => void;
  onSelect: (id: string) => void;
  voted?: boolean;
  onVote?: (id: string) => void;
}

export function ListingCard({ listing, active, onHover, onSelect, voted, onVote }: ListingCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      onMouseEnter={() => onHover(listing.id)}
      onFocus={() => onHover(listing.id)}
      onClick={() => onSelect(listing.id)}
      tabIndex={0}
      role="button"
      aria-label={`${listing.bhk} BHK in ${listing.area}, ${formatRent(listing.rent)} per month`}
      className={cn(
        "glass group cursor-pointer rounded-2xl p-4 outline-none transition-all duration-300",
        "hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring",
        active && "glow-ring",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="rounded-full bg-accent text-accent-foreground">{listing.bhk} BHK</Badge>
            <Badge variant="outline" className="rounded-full border-border text-muted-foreground">
              {listing.furnishing}
            </Badge>
            {listing.source === "To-Let Board" && (
              <Badge className="rounded-full bg-teal/15 text-teal">Board spotted</Badge>
            )}
          </div>
          <h3 className="mt-2 truncate text-base font-semibold tracking-tight">{listing.title}</h3>
          <p className="truncate text-sm text-muted-foreground">
            {listing.area} · {listing.sqft} sqft · {listing.tenant}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-bold tracking-tight">{formatRent(listing.rent)}</p>
          <p className="text-xs text-muted-foreground">
            {listing.negotiable ? "Negotiable" : "Fixed"} · {formatRent(listing.deposit)} dep
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <TrainFront className="size-3.5 shrink-0" aria-hidden /> {listing.metroKm} km metro
        </span>
        <span className="inline-flex items-center gap-1">
          <Building2 className="size-3.5 shrink-0" aria-hidden /> {listing.itCorridorKm} km IT hub
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3.5 shrink-0" aria-hidden /> {listing.votes} votes
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {listing.ownerVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
              <BadgeCheck className="size-3.5 shrink-0" aria-hidden /> Owner verified
            </span>
          )}
          {listing.communityVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal/15 px-2 py-0.5 text-xs text-teal">
              Community checked
            </span>
          )}
          {listing.suspiciousPrice && (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> Price looks off
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 opacity-70 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className={cn("size-8 rounded-full", voted && "bg-brand/15 text-brand")}
            aria-label={voted ? "Remove upvote" : "Upvote listing"}
            aria-pressed={!!voted}
            onClick={(e) => {
              e.stopPropagation();
              onVote?.(listing.id);
            }}
          >
            <ArrowBigUp className="size-4" />
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-3 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <Link to="/listing/$id" params={{ id: listing.id }}>
              Details
            </Link>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}
