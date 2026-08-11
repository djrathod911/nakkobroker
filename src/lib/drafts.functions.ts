import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const draftInput = z.object({
  draft: z.record(z.string(), z.unknown()),
  step: z.number().int().min(0).max(20),
});

export interface CloudDraft {
  draft: Record<string, unknown>;
  step: number;
  savedAt: number;
}

/** Reads the signed-in owner's cloud draft, if any. */
export const getCloudDraft = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CloudDraft | null> => {
    const { data, error } = await context.supabase
      .from("listing_drafts")
      .select("draft, step, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return {
      draft: (data.draft ?? {}) as Record<string, unknown>,
      step: data.step ?? 0,
      savedAt: new Date(data.updated_at).getTime(),
    };
  });

/** Upserts the owner's cloud draft so it follows them across devices. */
export const saveCloudDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => draftInput.parse(input))
  .handler(async ({ data, context }): Promise<{ savedAt: number }> => {
    const savedAt = new Date();
    const { error } = await context.supabase.from("listing_drafts").upsert(
      {
        user_id: context.userId,
        draft: data.draft as never,
        step: data.step,
        updated_at: savedAt.toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { savedAt: savedAt.getTime() };
  });

/** Removes the cloud draft (on publish or explicit discard). */
export const deleteCloudDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("listing_drafts")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
