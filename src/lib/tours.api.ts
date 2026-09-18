import { supabase } from "@/integrations/supabase/client";

export interface TourSlot {
  id: string;
  listing_id: string;
  owner_id: string;
  starts_at: string;
  duration_minutes: number;
  status: "open" | "booked" | "cancelled";
}

export interface TourBooking {
  id: string;
  slot_id: string;
  listing_id: string;
  owner_id: string;
  tenant_id: string;
  status: "confirmed" | "cancelled";
  note: string | null;
  created_at: string;
  startsAt: string;
  durationMinutes: number;
  listingTitle: string;
  listingArea: string;
  listingCity: string;
}

/** Upcoming slots published by the owner for one home. */
export async function fetchTourSlots(listingId: string): Promise<TourSlot[]> {
  const { data, error } = await supabase
    .from("tour_slots")
    .select("id,listing_id,owner_id,starts_at,duration_minutes,status")
    .eq("listing_id", listingId)
    .gt("starts_at", new Date().toISOString())
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TourSlot[];
}

/** Owner publishes new slots. Duplicate times are ignored. */
export async function addTourSlots(input: {
  listingId: string;
  ownerId: string;
  startsAt: string[];
  durationMinutes?: number;
}): Promise<number> {
  const rows = input.startsAt.map((starts_at) => ({
    listing_id: input.listingId,
    owner_id: input.ownerId,
    starts_at,
    duration_minutes: input.durationMinutes ?? 30,
  }));
  if (!rows.length) return 0;
  const { data, error } = await supabase
    .from("tour_slots")
    .upsert(rows, { onConflict: "listing_id,starts_at", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return data?.length ?? 0;
}

export async function removeTourSlot(slotId: string): Promise<void> {
  const { error } = await supabase.from("tour_slots").delete().eq("id", slotId);
  if (error) throw error;
}

/** Atomic one-click booking — fails if someone else just took the slot. */
export async function bookTourSlot(slotId: string, note?: string): Promise<string> {
  const { data, error } = await supabase.rpc("book_tour_slot", {
    _slot_id: slotId,
    _note: note ?? null,
  });
  if (error) throw error;
  return data as unknown as string;
}

export async function cancelTourBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_tour_booking", { _booking_id: bookingId });
  if (error) throw error;
}

interface BookingRow {
  id: string;
  slot_id: string;
  listing_id: string;
  owner_id: string;
  tenant_id: string;
  status: "confirmed" | "cancelled";
  note: string | null;
  created_at: string;
}

async function decorate(rows: BookingRow[]): Promise<TourBooking[]> {
  if (!rows.length) return [];
  const [slots, listings] = await Promise.all([
    supabase
      .from("tour_slots")
      .select("id,starts_at,duration_minutes")
      .in("id", rows.map((r) => r.slot_id)),
    supabase
      .from("listings")
      .select("id,title,area,city")
      .in("id", rows.map((r) => r.listing_id)),
  ]);
  if (slots.error) throw slots.error;
  if (listings.error) throw listings.error;

  const slotById = new Map((slots.data ?? []).map((s) => [s.id as string, s]));
  const listingById = new Map((listings.data ?? []).map((l) => [l.id as string, l]));

  return rows
    .map((r) => {
      const slot = slotById.get(r.slot_id);
      const listing = listingById.get(r.listing_id);
      return {
        ...r,
        startsAt: (slot?.starts_at as string) ?? r.created_at,
        durationMinutes: (slot?.duration_minutes as number) ?? 30,
        listingTitle: (listing?.title as string) ?? "This home",
        listingArea: (listing?.area as string) ?? "",
        listingCity: (listing?.city as string) ?? "Hyderabad",
      };
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/** Every tour the signed-in user is part of, as tenant or as owner. */
export async function fetchMyTours(userId: string): Promise<{
  asTenant: TourBooking[];
  asOwner: TourBooking[];
}> {
  const { data, error } = await supabase
    .from("tour_bookings")
    .select("id,slot_id,listing_id,owner_id,tenant_id,status,note,created_at")
    .eq("status", "confirmed");
  if (error) throw error;
  const rows = (data ?? []) as BookingRow[];
  const [asTenant, asOwner] = await Promise.all([
    decorate(rows.filter((r) => r.tenant_id === userId)),
    decorate(rows.filter((r) => r.owner_id === userId)),
  ]);
  return { asTenant, asOwner };
}

/** The signed-in tenant's confirmed tour for one home, if any. */
export async function fetchMyTourForListing(
  listingId: string,
  userId: string,
): Promise<TourBooking | null> {
  const { data, error } = await supabase
    .from("tour_bookings")
    .select("id,slot_id,listing_id,owner_id,tenant_id,status,note,created_at")
    .eq("listing_id", listingId)
    .eq("tenant_id", userId)
    .eq("status", "confirmed")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [booking] = await decorate([data as BookingRow]);
  return booking ?? null;
}

const DAY_FMT = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

export function tourDayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (sameDay(d, today)) return "Today";
  const tomorrow = new Date(today.getTime() + 86_400_000);
  if (sameDay(d, tomorrow)) return "Tomorrow";
  return DAY_FMT.format(d);
}

export function tourTimeLabel(iso: string) {
  return TIME_FMT.format(new Date(iso));
}

export function tourDayKey(iso: string) {
  return new Date(iso).toDateString();
}
