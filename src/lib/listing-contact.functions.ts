import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ContactInput = z.object({ listingId: z.string().uuid() });

/**
 * Returns a listing's contact phone to signed-in users only, and only when the
 * listing is published or owned by the caller. Replaces the previous
 * SECURITY DEFINER database function so no privileged DB routine is exposed to
 * the client API surface.
 */
export const getListingContactPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => ContactInput.parse(data))
  .handler(async ({ data, context }): Promise<{ phone: string | null }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("listings")
      .select("contact_phone,status,owner_id")
      .eq("id", data.listingId)
      .maybeSingle();

    if (error) {
      console.error("[listing-contact] lookup failed", error);
      throw new Error("Could not load contact details");
    }
    if (!row) return { phone: null };
    if (row.status !== "published" && row.owner_id !== context.userId) {
      return { phone: null };
    }
    return { phone: row.contact_phone ?? null };
  });
