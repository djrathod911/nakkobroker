import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BookInput = z.object({
  slotId: z.string().uuid(),
  note: z.string().max(500).optional(),
});

const CancelInput = z.object({ bookingId: z.string().uuid() });

/**
 * Books a tour slot for the signed-in user. The privileged database routine is
 * no longer callable by the client API; the caller identity is verified here
 * and passed explicitly to the service-role call.
 */
export const bookTourSlotFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => BookInput.parse(data))
  .handler(async ({ data, context }): Promise<{ bookingId: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await supabaseAdmin.rpc("book_tour_slot", {
      _slot_id: data.slotId,
      _actor: context.userId,
      ...(data.note ? { _note: data.note } : {}),
    });
    if (error) throw new Error(error.message);
    return { bookingId: id as unknown as string };
  });

/** Cancels a tour booking the signed-in user is part of. */
export const cancelTourBookingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CancelInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("cancel_tour_booking", {
      _booking_id: data.bookingId,
      _actor: context.userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
