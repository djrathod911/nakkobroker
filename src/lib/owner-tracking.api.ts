import { supabase } from "@/integrations/supabase/client";

export interface ListingTracking {
  chats: number;
  unread: number;
  upcomingTours: number;
  pastTours: number;
  nextTourAt: string | null;
  rentReceived: number;
  rentPending: number;
  openRepairs: number;
}

const empty = (): ListingTracking => ({
  chats: 0,
  unread: 0,
  upcomingTours: 0,
  pastTours: 0,
  nextTourAt: null,
  rentReceived: 0,
  rentPending: 0,
  openRepairs: 0,
});

/** Per-listing activity for the signed-in owner. All reads are scoped by RLS. */
export async function fetchOwnerTracking(userId: string): Promise<Record<string, ListingTracking>> {
  const out: Record<string, ListingTracking> = {};
  const get = (id: string | null) => {
    if (!id) return null;
    return (out[id] ??= empty());
  };

  const [convs, tours, rent, repairs] = await Promise.all([
    supabase.from("conversations").select("id,listing_id").eq("owner_id", userId),
    supabase
      .from("tour_bookings")
      .select("listing_id,status,tour_slots(starts_at)")
      .eq("owner_id", userId),
    supabase.from("rent_payments").select("listing_id,amount,status").eq("owner_id", userId),
    supabase.from("maintenance_requests").select("listing_id,status").eq("owner_id", userId),
  ]);

  const convRows = convs.data ?? [];
  const convToListing = new Map(convRows.map((c) => [c.id as string, c.listing_id as string]));
  for (const c of convRows) get(c.listing_id as string)!.chats++;

  if (convRows.length) {
    const { data: unread } = await supabase
      .from("messages")
      .select("conversation_id")
      .in("conversation_id", convRows.map((c) => c.id as string))
      .eq("read", false)
      .neq("sender_id", userId);
    for (const m of unread ?? []) {
      const t = get(convToListing.get(m.conversation_id as string) ?? null);
      if (t) t.unread++;
    }
  }

  const now = Date.now();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const b of (tours.data ?? []) as any[]) {
    if (b.status === "cancelled") continue;
    const t = get(b.listing_id);
    if (!t) continue;
    const at: string | undefined = Array.isArray(b.tour_slots) ? b.tour_slots[0]?.starts_at : b.tour_slots?.starts_at;
    if (at && new Date(at).getTime() >= now) {
      t.upcomingTours++;
      if (!t.nextTourAt || at < t.nextTourAt) t.nextTourAt = at;
    } else t.pastTours++;
  }

  for (const p of rent.data ?? []) {
    const t = get(p.listing_id as string);
    if (!t) continue;
    if (p.status === "pending") t.rentPending++;
    else if (p.status !== "rejected" && p.status !== "not_received") t.rentReceived += p.amount as number;
  }

  for (const r of repairs.data ?? []) {
    const t = get(r.listing_id as string | null);
    if (t && r.status !== "resolved" && r.status !== "closed") t.openRepairs++;
  }

  return out;
}

export const emptyTracking = empty;
