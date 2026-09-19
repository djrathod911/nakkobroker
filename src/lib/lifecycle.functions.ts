import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ConfirmInput = z.object({ listingId: z.string().uuid() });

/**
 * Owner confirms a home is still available. Resets the freshness clock, clears
 * any delisting warning and relists the home if it had already come down.
 * The privileged routine is service-role only; the caller is verified here.
 */
export const confirmListingFreshnessFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ConfirmInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("confirm_listing_freshness", {
      _listing_id: data.listingId,
      _actor: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
