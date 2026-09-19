import type { Listing } from "@/data/listings";

/** A configurable lifecycle rule for a market / segment / property type. */
export interface LifecycleRule {
  id: string;
  name: string;
  city: string | null;
  houseType: string | null;
  source: string | null;
  priority: number;
  warnAfterDays: number;
  graceDays: number;
  decayHalfLifeDays: number;
}

export const DEFAULT_RULE: LifecycleRule = {
  id: "default",
  name: "Global default",
  city: null,
  houseType: null,
  source: null,
  priority: -1,
  warnAfterDays: 10,
  graceDays: 4,
  decayHalfLifeDays: 14,
};

/** Most specific matching rule wins, then highest priority. */
export function resolveRule(listing: Listing, rules: LifecycleRule[]): LifecycleRule {
  const city = listing.city ?? "Hyderabad";
  const houseType = listing.houseType ?? "Flat";
  const matches = rules
    .filter(
      (r) =>
        (r.city === null || r.city === city) &&
        (r.houseType === null || r.houseType === houseType) &&
        (r.source === null || r.source === listing.source),
    )
    .sort((a, b) => {
      const spec = (r: LifecycleRule) =>
        Number(r.city !== null) + Number(r.houseType !== null) + Number(r.source !== null);
      return spec(b) - spec(a) || b.priority - a.priority;
    });
  return matches[0] ?? DEFAULT_RULE;
}

export const daysSinceConfirmed = (listing: Listing) => {
  const stamp = listing.lastConfirmedAt
    ? new Date(listing.lastConfirmedAt).getTime()
    : Date.now() - listing.postedDaysAgo * 86_400_000;
  return Math.max(0, (Date.now() - stamp) / 86_400_000);
};

/** 1 when just confirmed, halving every `decayHalfLifeDays`. */
export function freshnessScore(listing: Listing, rule: LifecycleRule): number {
  return Math.pow(0.5, daysSinceConfirmed(listing) / Math.max(1, rule.decayHalfLifeDays));
}

/** True once the owner has been warned that the home will be delisted. */
export const isStale = (listing: Listing) => listing.lifecycleState === "warned";

/**
 * Search relevance: freshness decay is the dominant factor, community upvotes
 * break ties. Homes never disappear from the ranking — they only sink.
 */
export function rankListings(listings: Listing[], rules: LifecycleRule[]): Listing[] {
  return [...listings].sort((a, b) => {
    const sa = freshnessScore(a, resolveRule(a, rules)) + Math.min(a.votes, 20) * 0.01;
    const sb = freshnessScore(b, resolveRule(b, rules)) + Math.min(b.votes, 20) * 0.01;
    return sb - sa;
  });
}
