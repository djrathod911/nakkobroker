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
    const bookingId = id as unknown as string;

    // Best-effort confirmation email — a send failure must never fail the booking.
    try {
      const [{ data: slot }, { data: tenantUser }] = await Promise.all([
        supabaseAdmin
          .from("tour_slots")
          .select("starts_at,listings(id,title,area,city,contact_phone,owner_id)")
          .eq("id", data.slotId)
          .single(),
        supabaseAdmin.auth.admin.getUserById(context.userId),
      ]);
      const tenantEmail = tenantUser?.user?.email;
      const listing = (slot?.listings ?? null) as {
        id: string;
        title: string;
        area: string | null;
        city: string | null;
        contact_phone: string | null;
        owner_id: string;
      } | null;

      if (slot && listing && tenantEmail) {
        const { data: ownerProfile } = await supabaseAdmin
          .from("profiles")
          .select("display_name")
          .eq("id", listing.owner_id)
          .maybeSingle();

        const starts = new Date(slot.starts_at as string);
        const dayFmt = new Intl.DateTimeFormat("en-IN", {
          weekday: "short",
          day: "numeric",
          month: "short",
          timeZone: "Asia/Kolkata",
        });
        const timeFmt = new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        });

        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("tour-confirmation", tenantEmail, {
          templateData: {
            tenantName:
              (tenantUser.user?.user_metadata?.["full_name"] as string | undefined) ?? undefined,
            listingTitle: listing.title,
            listingArea: listing.area ?? undefined,
            listingCity: listing.city ?? undefined,
            tourDay: dayFmt.format(starts),
            tourTime: timeFmt.format(starts),
            ownerName: (ownerProfile?.display_name as string | undefined) ?? undefined,
            ownerPhone: listing.contact_phone ?? undefined,
            listingUrl: `https://nakkobroker.com/listing/${listing.id}`,
          },
          idempotencyKey: `tour-confirmation-${bookingId}`,
        });
      }
    } catch (emailError) {
      console.error("[tours] confirmation email failed", emailError);
    }

    return { bookingId };
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
