import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BadgeCheck, MessagesSquare, Send } from "lucide-react";
import { RenterBadge, useRenterReputation } from "@/components/reputation/RenterBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchListingThreads,
  fetchMessages,
  fetchMyConversationForListing,
  markConversationRead,
  requestViewing,
  sendMessage,
} from "@/lib/messages.api";

interface Props {
  listingId: string;
  ownerId: string | null;
  userId: string | null;
  listingTitle: string;
}

export function ListingChat({ listingId, ownerId, userId, listingTitle }: Props) {
  const queryClient = useQueryClient();
  const isOwner = !!userId && userId === ownerId;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: myConversationId, isLoading: loadingMine } = useQuery({
    queryKey: ["my-conversation", listingId, userId],
    queryFn: () => fetchMyConversationForListing(listingId, userId!),
    enabled: !!userId && !isOwner,
  });

  const { data: threads = [], isLoading: loadingThreads } = useQuery({
    queryKey: ["listing-threads", listingId, userId],
    queryFn: () => fetchListingThreads(listingId, userId!),
    enabled: isOwner,
  });

  const conversationId = isOwner ? (activeId ?? threads[0]?.id ?? null) : (myConversationId ?? null);
  const activeThread = isOwner ? threads.find((t) => t.id === conversationId) : undefined;
  const reputation = useRenterReputation(isOwner ? threads.map((t) => t.tenant_id) : []);

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => fetchMessages(conversationId!),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`listing-chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  useEffect(() => {
    if (conversationId && userId && messages.length) void markConversationRead(conversationId, userId);
    if (messages.length) bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, conversationId, userId]);

  if (!userId) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Chat with the owner</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask about the rent, availability or a viewing — directly, no brokers.
        </p>
        <Button asChild variant="secondary" className="mt-3 rounded-2xl">
          <Link to="/auth" search={{ next: `/listing/${listingId}` }}>
            <MessagesSquare className="size-4" /> Sign in to message the owner
          </Link>
        </Button>
      </div>
    );
  }

  if (!isOwner && !ownerId) {
    return (
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          This home was spotted by the community, so there is no owner chat yet.
        </p>
      </div>
    );
  }

  async function onSend() {
    const body = draft.trim();
    if (!body || !userId) return;
    setSending(true);
    try {
      if (!conversationId) {
        const newId = await requestViewing({
          listingId,
          ownerId: ownerId!,
          tenantId: userId,
          preferredTime: "",
          message: body,
        });
        setDraft("");
        await queryClient.invalidateQueries({ queryKey: ["my-conversation", listingId, userId] });
        await queryClient.invalidateQueries({ queryKey: ["messages", newId] });
        await queryClient.invalidateQueries({ queryKey: ["conversations"] });
        toast.success("Message sent — the owner will reply here");
      } else {
        await sendMessage(conversationId, userId, body);
        setDraft("");
        await queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      }
    } catch {
      toast.error("Message not sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  const loading = isOwner ? loadingThreads : loadingMine;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-semibold">
        {isOwner ? "Messages from tenants" : "Chat with the owner"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {isOwner
          ? "Reply to people interested in this home."
          : `Ask anything about ${listingTitle}. Replies appear here in real time.`}
      </p>

      {isOwner && threads.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {threads.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              aria-pressed={t.id === conversationId}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                t.id === conversationId
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.tenantName}
              {t.unread ? ` · ${t.unread} new` : ""}
              {reputation.data?.get(t.tenant_id)?.good_renter && (
                <BadgeCheck className="size-3.5" aria-label="Good renter" />
              )}
            </button>
          ))}
        </div>
      )}

      {isOwner && activeThread && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Chatting with {activeThread.tenantName}</span>
          <RenterBadge rep={reputation.data?.get(activeThread.tenant_id)} />
        </div>
      )}

      {loading ? (
        <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
      ) : (
        <div
          className="mt-3 max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-secondary/30 p-3"
          aria-label="Conversation"
        >
          {messages.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              {isOwner ? "No messages yet." : "No messages yet — say hello."}
            </p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      mine ? "bg-brand text-brand-foreground" : "glass text-foreground"
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.body}</p>
                    <p
                      className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}
                    >
                      {new Date(m.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {(!isOwner || conversationId) && (
        <div className="mt-3 flex items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void onSend();
              }
            }}
            rows={2}
            maxLength={1000}
            placeholder={isOwner ? "Write a reply…" : "Is this still available?"}
            className="rounded-2xl"
          />
          <Button
            className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => void onSend()}
            disabled={sending || !draft.trim()}
            aria-label="Send message"
          >
            <Send className="size-4" />
          </Button>
        </div>
      )}

      {conversationId && (
        <Button asChild variant="ghost" className="mt-2 rounded-2xl text-xs">
          <Link to="/messages/$id" params={{ id: conversationId }}>
            Open full chat
          </Link>
        </Button>
      )}
    </div>
  );
}
