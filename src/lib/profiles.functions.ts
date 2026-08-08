import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ ids: z.array(z.string().uuid()).max(200) });

export interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

/**
 * Safe display-name lookup. Only returns a profile when the caller is that
 * user, shares a conversation with them, or the user owns a published
 * listing. Replaces the SECURITY DEFINER RPC that signed-in clients could
 * call directly.
 */
export const getProfileDisplayNames = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }): Promise<PublicProfile[]> => {
    const ids = [...new Set(data.ids)];
    if (!ids.length) return [];

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const me = context.userId;

    const [convos, published] = await Promise.all([
      supabaseAdmin
        .from("conversations")
        .select("tenant_id,owner_id")
        .or(`tenant_id.eq.${me},owner_id.eq.${me}`),
      supabaseAdmin
        .from("listings")
        .select("owner_id")
        .eq("status", "published")
        .in("owner_id", ids),
    ]);

    const allowed = new Set<string>([me]);
    for (const c of convos.data ?? []) {
      if (c.tenant_id === me && c.owner_id) allowed.add(c.owner_id);
      if (c.owner_id === me && c.tenant_id) allowed.add(c.tenant_id);
    }
    for (const l of published.data ?? []) if (l.owner_id) allowed.add(l.owner_id);

    const visible = ids.filter((id) => allowed.has(id));
    if (!visible.length) return [];

    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", visible);

    if (error) {
      console.error("[profiles] display name lookup failed", error);
      throw new Error("Could not load participant details");
    }
    return (rows ?? []) as PublicProfile[];
  });
