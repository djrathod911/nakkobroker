import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchConversation,
  fetchMessages,
  markConversationRead,
  sendMessage,
} from "@/lib/messages.api";

const TITLE = "Chat with the owner — NakkoBroker";
const DESCRIPTION = "Direct, broker-free conversation about a rental home on NakkoBroker.";

export const Route = createFileRoute("/_authenticated/messages/$id")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ThreadPage,
});

function ThreadPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: detail, isLoading } = useQuery({
    queryKey: ["conversation", id, user?.id],
    queryFn: () => fetchConversation(id, user!.id),
    enabled: !!user,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["messages", id],
    queryFn: () => fetchMessages(id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, user, queryClient]);

  useEffect(() => {
    if (user && messages.length) void markConversationRead(id, user.id);
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, id, user]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [id]);

  async function onSend() {
    const body = draft.trim();
    if (!body || !user) return;
    setSending(true);
    try {
      await sendMessage(id, user.id, body);
      setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["messages", id] });
      inputRef.current?.focus();
    } catch {
      toast.error("Message not sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading chat…</p>
      </main>
    );
  }

  if (!detail) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-2xl font-semibold">Chat not available</h1>
        <Button asChild className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90">
          <Link to="/messages">Back to your chats</Link>
        </Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-6 pt-6">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" className="rounded-2xl">
            <Link to="/messages">
              <ArrowLeft className="size-4" /> Chats
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-2xl text-sm">
            <Link to="/listing/$id" params={{ id: detail.conversation.listing_id }}>
              View home
            </Link>
          </Button>
        </div>

        <header className="mt-3">
          <h1 className="text-xl font-semibold tracking-tight">{detail.listingTitle}</h1>
          <p className="text-sm text-muted-foreground">
            with {detail.counterpartName}
            {detail.listingArea ? ` · ${detail.listingArea}` : ""}
            {detail.conversation.preferred_time
              ? ` · prefers ${detail.conversation.preferred_time}`
              : ""}
          </p>
        </header>

        <section className="mt-4 flex-1 space-y-3 overflow-y-auto" aria-label="Messages">
          {messages.map((m) => {
            const mine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    mine ? "bg-brand text-brand-foreground" : "glass text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-line">{m.body}</p>
                  <p className={`mt-1 text-[10px] ${mine ? "opacity-70" : "text-muted-foreground"}`}>
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
          })}
          <div ref={bottomRef} />
        </section>

        <div className="mt-4 flex items-end gap-2">
          <Textarea
            ref={inputRef}
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
            placeholder="Write a message…"
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
      </div>
    </main>
  );
}
