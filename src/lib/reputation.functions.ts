import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface RenterReputation {
  user_id: string;
  on_time_months: number;
  late_months: number;
  late_last_year: number;
  good_renter: boolean;
}

const Input = z.object({ ids: z.array(z.string().uuid()).min(1).max(50) });

/** Aggregate rent record (counts only, no amounts or homes) for signed-in viewers. */
export const getRenterReputation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<RenterReputation[]> => {
    // Authorization: a caller may only look up their own record or renters
    // connected to one of their listings (chat, tour booking, or rent record).
    // These reads run as the caller, so RLS enforces ownership.
    const allowed = new Set<string>([context.userId]);
    const [chats, tours, rents] = await Promise.all([
      context.supabase.from("conversations").select("tenant_id").eq("owner_id", context.userId),
      context.supabase.from("tour_bookings").select("tenant_id").eq("owner_id", context.userId),
      context.supabase.from("rent_payments").select("tenant_id").eq("owner_id", context.userId),
    ]);
    for (const row of chats.data ?? []) allowed.add(row.tenant_id);
    for (const row of tours.data ?? []) allowed.add(row.tenant_id);
    for (const row of rents.data ?? []) allowed.add(row.tenant_id);

    const ids = data.ids.filter((id) => allowed.has(id));
    if (ids.length === 0) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_renter_reputation", {
      _ids: ids,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as RenterReputation[];
  });
