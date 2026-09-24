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
  .handler(async ({ data }): Promise<RenterReputation[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("get_renter_reputation", {
      _ids: data.ids,
    });
    if (error) throw new Error(error.message);
    return (rows ?? []) as RenterReputation[];
  });
