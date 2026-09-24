import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck } from "lucide-react";
import { getRenterReputation, type RenterReputation } from "@/lib/reputation.functions";

export function useRenterReputation(ids: string[]) {
  const fetchRep = useServerFn(getRenterReputation);
  const key = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["renter-reputation", key],
    queryFn: () => fetchRep({ data: { ids: key } }),
    enabled: key.length > 0,
    staleTime: 5 * 60_000,
    select: (rows: RenterReputation[]) => new Map(rows.map((r) => [r.user_id, r])),
  });
}

export function RenterBadge({ rep, compact }: { rep?: RenterReputation; compact?: boolean }) {
  if (!rep) return null;
  if (rep.good_renter) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-semibold text-brand"
        title={`${rep.on_time_months} months of rent confirmed on time by owners`}
      >
        <BadgeCheck className="size-3.5" aria-hidden /> Good renter
        {!compact && ` · ${rep.on_time_months} on-time months`}
      </span>
    );
  }
  if (compact || rep.on_time_months === 0) return null;
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-muted-foreground">
      {rep.on_time_months} on-time {rep.on_time_months === 1 ? "month" : "months"}
    </span>
  );
}
