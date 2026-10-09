import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fetchMyConversationForListing, requestViewing } from "@/lib/messages.api";

const SLOTS = ["Today evening", "Tomorrow morning", "Tomorrow evening", "This weekend"];

export function RequestViewingButton({
  listingId,
  ownerId,
  userId,
  listingTitle,
}: {
  listingId: string;
  ownerId: string | null;
  userId: string | null;
  listingTitle: string;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState(SLOTS[0]!);
  const [note, setNote] = useState("");

  const isOwnListing = !!userId && userId === ownerId;

  const { data: existingId } = useQuery({
    queryKey: ["my-conversation", listingId, userId],
    queryFn: () => fetchMyConversationForListing(listingId, userId!),
    enabled: !!userId && !isOwnListing,
  });

  const mutation = useMutation({
    mutationFn: () =>
      requestViewing({
        listingId,
        ownerId: ownerId!,
        tenantId: userId!,
        preferredTime: slot,
        message:
          note.trim() ||
          `Hi! I'd like to see ${listingTitle}. Would ${slot.toLowerCase()} work for a viewing?`,
      }),
    onSuccess: async (conversationId) => {
      setOpen(false);
      setNote("");
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      toast.success("Request sent — the owner will reply in your chat");
      navigate({ to: "/messages/$id", params: { id: conversationId } });
    },
    onError: () => toast.error("Could not send your request. Please try again."),
  });

  if (isOwnListing) return null;

  if (!ownerId) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        This home was spotted by the community, so there is no owner chat yet.
      </p>
    );
  }

  if (!userId) {
    return (
      <Button asChild variant="secondary" className="mt-3 h-auto min-h-11 w-full whitespace-normal rounded-2xl text-center">
        <Link to="/auth" search={{ next: `/listing/${listingId}` }}>
          <CalendarClock className="size-4" /> Sign in to request a viewing
        </Link>
      </Button>
    );
  }

  if (existingId) {
    return (
      <Button asChild variant="secondary" className="mt-3 h-auto min-h-11 w-full whitespace-normal rounded-2xl text-center">
        <Link to="/messages/$id" params={{ id: existingId }}>
          <MessagesSquare className="size-4" /> Open your chat with the owner
        </Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="mt-3 min-h-11 w-full rounded-2xl">
          <CalendarClock className="size-4" /> Request a viewing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] overflow-y-auto overscroll-contain rounded-2xl p-4 sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle>Request a viewing</DialogTitle>
          <DialogDescription>
            We&apos;ll start a direct chat with the owner. No brokers, no fees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="viewing-time">Preferred time</Label>
            <div className="flex flex-wrap gap-2">
              {SLOTS.map((s) => (
                <Button variant="outline"
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  aria-pressed={slot === s}
                  className={`h-auto min-h-11 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    slot === s
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s}
                </Button>
              ))}
            </div>
            <Input
              id="viewing-time"
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              placeholder="Or type a time that suits you"
              className="h-11 rounded-xl text-base sm:text-sm"
              maxLength={80}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="viewing-note">Message to the owner</Label>
            <Textarea
              id="viewing-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              maxLength={600}
              placeholder={`Hi! I'd like to see ${listingTitle}. Would ${slot.toLowerCase()} work?`}
              className="rounded-xl text-base sm:text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="min-h-11 w-full rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
            disabled={mutation.isPending || !slot.trim()}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Sending…" : "Send request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
