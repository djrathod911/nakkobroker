import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BellPlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createSavedAlert, deleteSavedAlert, fetchSavedAlerts } from "@/lib/alerts.api";
import { formatRent } from "@/data/listings";
import type { Filters } from "@/components/listings/FilterPanel";

export function SaveAlertPanel({ filters, userId }: { filters: Filters; userId: string | undefined }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [instant, setInstant] = useState(true);
  const [digest, setDigest] = useState(true);

  const { data: alerts = [] } = useQuery({
    queryKey: ["saved-alerts", userId],
    queryFn: fetchSavedAlerts,
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["saved-alerts", userId] });

  const save = useMutation({
    mutationFn: () => createSavedAlert(userId!, name, filters, { instant, dailyDigest: digest }),
    onSuccess: () => {
      setName("");
      toast.success("Alert saved — we'll notify you on new matches");
      void invalidate();
    },
    onError: () => toast.error("Could not save that alert"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteSavedAlert(id),
    onSuccess: invalidate,
  });

  const summary = [
    filters.bhk.length ? `${filters.bhk.join("/")} BHK` : "Any BHK",
    `under ${formatRent(filters.maxRent)}`,
    filters.ownerOnly ? "owners only" : null,
    ...filters.furnishing,
    ...filters.amenities,
  ]
    .filter(Boolean)
    .join(" · ");

  if (!userId) {
    return (
      <div className="mt-6 rounded-2xl border border-border/60 p-4">
        <p className="text-sm font-medium">Get alerted on new matches</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Sign in to save this search and get notified the moment a matching pin or To-Let board is
          added.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4 rounded-2xl border border-border/60 p-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Alert me about new matches</h3>
        <p className="mt-1 text-xs text-muted-foreground">{summary}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="alert-name">Alert name</Label>
        <Input
          id="alert-name"
          maxLength={60}
          placeholder="2BHK near Madhapur metro"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="alert-instant" className="text-xs font-normal text-muted-foreground">
          Notify me instantly
        </Label>
        <Switch id="alert-instant" checked={instant} onCheckedChange={setInstant} />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="alert-digest" className="text-xs font-normal text-muted-foreground">
          Daily digest (9am)
        </Label>
        <Switch id="alert-digest" checked={digest} onCheckedChange={setDigest} />
      </div>

      <Button
        className="w-full rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
        disabled={save.isPending || (!instant && !digest)}
        onClick={() => save.mutate()}
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <BellPlus className="size-4" />}
        Save this search as an alert
      </Button>

      {alerts.length > 0 && (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Your alerts
          </p>
          {alerts.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{a.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.bhk.length ? `${a.bhk.join("/")} BHK` : "Any BHK"} · under {formatRent(a.maxRent)}
                  {a.instant ? " · instant" : ""}
                  {a.dailyDigest ? " · digest" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete alert ${a.name}`}
                className="size-7 shrink-0"
                onClick={() => remove.mutate(a.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
