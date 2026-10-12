import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Opens the tenant↔owner chat for a home, creating it if needed. */
export function AskOwnerButton({
  listingId,
  ownerId,
  tenantId,
  userId,
  label = "Ask owner",
}: {
  listingId: string;
  ownerId: string | null;
  tenantId: string;
  userId?: string | undefined;
  label?: string;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  if (!ownerId || !userId || (userId !== tenantId && userId !== ownerId)) return null;
  const isOwner = userId === ownerId;

  async function open() {
    setBusy(true);
    try {
      const existing = await supabase
        .from("conversations")
        .select("id")
        .eq("listing_id", listingId)
        .eq("tenant_id", tenantId)
        .maybeSingle();
      if (existing.error) throw existing.error;
      let id = existing.data?.id as string | undefined;
      if (!id) {
        if (isOwner) throw new Error("no-thread");
        const { data, error } = await supabase
          .from("conversations")
          .insert({ listing_id: listingId, owner_id: ownerId!, tenant_id: tenantId, preferred_time: "" })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id as string;
      }
      await navigate({ to: "/messages/$id", params: { id } });
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "no-thread"
          ? "Your tenant hasn't started a chat yet."
          : "Could not open chat. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button size="sm" variant="secondary" className="min-h-9 rounded-xl" disabled={busy} onClick={() => void open()}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
      {isOwner ? "Message tenant" : label}
    </Button>
  );
}
