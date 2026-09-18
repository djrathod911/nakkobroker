import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, CalendarPlus, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addTourSlots,
  bookTourSlot,
  cancelTourBooking,
  fetchMyTourForListing,
  fetchTourSlots,
  removeTourSlot,
  tourDayKey,
  tourDayLabel,
  tourTimeLabel,
  type TourSlot,
} from "@/lib/tours.api";

const TIME_CHOICES = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

function nextDays(count: number) {
  const out: Date[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i += 1) out.push(new Date(base.getTime() + i * 86_400_000));
  return out;
}

function combine(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function TourScheduler({
  listingId,
  ownerId,
  userId,
  listingTitle,
}: {
  listingId: string;
  ownerId: string | null;
  userId: string | null;
  listingTitle: string;
}) {
  const queryClient = useQueryClient();
  const isOwner = !!userId && userId === ownerId;

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["tour-slots", listingId],
    queryFn: () => fetchTourSlots(listingId),
    enabled: !!ownerId,
  });

  const { data: myTour } = useQuery({
    queryKey: ["my-tour", listingId, userId],
    queryFn: () => fetchMyTourForListing(listingId, userId!),
    enabled: !!userId && !isOwner,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["tour-slots", listingId] }),
      queryClient.invalidateQueries({ queryKey: ["my-tour", listingId, userId] }),
      queryClient.invalidateQueries({ queryKey: ["my-tours", userId] }),
    ]);
  };

  if (!ownerId) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarCheck className="size-4 text-brand" aria-hidden /> Tour calendar
      </h3>

      {isOwner ? (
        <OwnerCalendar
          listingId={listingId}
          ownerId={ownerId}
          slots={slots}
          isLoading={isLoading}
          onChanged={refresh}
        />
      ) : (
        <TenantCalendar
          listingId={listingId}
          userId={userId}
          listingTitle={listingTitle}
          slots={slots}
          isLoading={isLoading}
          booking={myTour ?? null}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

/* ------------------------------- Owner view ------------------------------- */

function OwnerCalendar({
  listingId,
  ownerId,
  slots,
  isLoading,
  onChanged,
}: {
  listingId: string;
  ownerId: string;
  slots: TourSlot[];
  isLoading: boolean;
  onChanged: () => Promise<void>;
}) {
  const days = useMemo(() => nextDays(14), []);
  const [day, setDay] = useState<Date>(days[0]!);
  const [times, setTimes] = useState<string[]>([]);

  const existing = useMemo(
    () => new Set(slots.map((s) => new Date(s.starts_at).getTime())),
    [slots],
  );

  const publish = useMutation({
    mutationFn: () =>
      addTourSlots({
        listingId,
        ownerId,
        startsAt: times.map((t) => combine(day, t).toISOString()),
      }),
    onSuccess: async (count) => {
      setTimes([]);
      await onChanged();
      toast.success(count ? `${count} slot${count > 1 ? "s" : ""} published` : "Slots updated");
    },
    onError: () => toast.error("Could not publish those slots"),
  });

  const remove = useMutation({
    mutationFn: (slotId: string) => removeTourSlot(slotId),
    onSuccess: async () => {
      await onChanged();
      toast.success("Slot removed");
    },
    onError: () => toast.error("Could not remove that slot"),
  });

  return (
    <div className="mt-2 space-y-4">
      <p className="text-sm text-muted-foreground">
        Publish the times you can show the home. Tenants book one in a single tap — no messaging
        back and forth.
      </p>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pick a day</p>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {days.map((d) => {
            const active = d.toDateString() === day.toDateString();
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setDay(d)}
                aria-pressed={active}
                className={`shrink-0 rounded-2xl border px-3 py-2 text-xs transition-colors ${
                  active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tourDayLabel(d.toISOString())}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Pick times</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {TIME_CHOICES.map((t) => {
            const when = combine(day, t);
            const already = existing.has(when.getTime());
            const past = when.getTime() < Date.now();
            const active = times.includes(t);
            return (
              <button
                key={t}
                type="button"
                disabled={already || past}
                onClick={() =>
                  setTimes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
                }
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {tourTimeLabel(when.toISOString())}
                {already ? " · added" : ""}
              </button>
            );
          })}
        </div>
      </div>

      <Button
        className="w-full rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
        disabled={!times.length || publish.isPending}
        onClick={() => publish.mutate()}
      >
        {publish.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CalendarPlus className="size-4" />
        )}
        {publish.isPending ? "Publishing…" : `Publish ${times.length || ""} slot${times.length === 1 ? "" : "s"}`}
      </Button>

      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Your open times</p>
        {isLoading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : slots.length ? (
          <ul className="mt-2 space-y-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm"
              >
                <span>
                  {tourDayLabel(s.starts_at)} · {tourTimeLabel(s.starts_at)}
                  {s.status === "booked" && (
                    <span className="ml-2 rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">
                      Booked
                    </span>
                  )}
                </span>
                {s.status === "open" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-xl"
                    aria-label={`Remove ${tourDayLabel(s.starts_at)} ${tourTimeLabel(s.starts_at)}`}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(s.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            No times published yet. Pick a day and a few times above.
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Tenant view ------------------------------- */

function TenantCalendar({
  listingId,
  userId,
  listingTitle,
  slots,
  isLoading,
  booking,
  onChanged,
}: {
  listingId: string;
  userId: string | null;
  listingTitle: string;
  slots: TourSlot[];
  isLoading: boolean;
  booking: { id: string; startsAt: string } | null;
  onChanged: () => Promise<void>;
}) {
  const open = slots.filter((s) => s.status === "open");

  const grouped = useMemo(() => {
    const map = new Map<string, TourSlot[]>();
    for (const s of open) {
      const key = tourDayKey(s.starts_at);
      map.set(key, [...(map.get(key) ?? []), s]);
    }
    return [...map.entries()];
  }, [open]);

  const book = useMutation({
    mutationFn: (slotId: string) =>
      bookTourSlot(slotId, `Tour request for ${listingTitle}`),
    onSuccess: async () => {
      await onChanged();
      toast.success("Tour confirmed — see you there!");
    },
    onError: () => {
      void onChanged();
      toast.error("That slot was just taken. Please pick another.");
    },
  });

  const cancel = useMutation({
    mutationFn: (bookingId: string) => cancelTourBooking(bookingId),
    onSuccess: async () => {
      await onChanged();
      toast.success("Tour cancelled");
    },
    onError: () => toast.error("Could not cancel the tour"),
  });

  if (booking) {
    return (
      <div className="mt-2 rounded-2xl border border-success/40 bg-success/10 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="size-4" aria-hidden /> Tour confirmed
        </p>
        <p className="mt-1 text-sm">
          {tourDayLabel(booking.startsAt)} at {tourTimeLabel(booking.startsAt)}
        </p>
        <Button
          variant="ghost"
          className="mt-2 rounded-2xl text-destructive hover:text-destructive"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(booking.id)}
        >
          <X className="size-4" /> Cancel this tour
        </Button>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mt-2">
        <p className="text-sm text-muted-foreground">
          Sign in to pick a tour time straight from the owner&apos;s calendar.
        </p>
        <Button asChild variant="secondary" className="mt-3 rounded-2xl">
          <Link to="/auth" search={{ next: `/listing/${listingId}` }}>
            <CalendarCheck className="size-4" /> Sign in to book a tour
          </Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return <p className="mt-2 text-sm text-muted-foreground">Loading available times…</p>;
  }

  if (!open.length) {
    return (
      <p className="mt-2 text-sm text-muted-foreground">
        The owner hasn&apos;t opened any tour times yet. Send a viewing request below instead.
      </p>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <p className="text-sm text-muted-foreground">
        Tap a time to lock it in instantly — no back-and-forth needed.
      </p>
      {grouped.map(([key, daySlots]) => (
        <div key={key}>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {tourDayLabel(daySlots[0]!.starts_at)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {daySlots.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={book.isPending}
                onClick={() => book.mutate(s.id)}
                className="rounded-full border border-border bg-secondary/60 px-3 py-2 text-xs text-foreground transition-colors hover:border-brand hover:bg-brand hover:text-brand-foreground disabled:opacity-50"
              >
                {tourTimeLabel(s.starts_at)}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
