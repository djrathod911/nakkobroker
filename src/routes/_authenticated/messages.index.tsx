import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchConversations } from "@/lib/messages.api";

const TITLE = "Your chats — NakkoBroker";
const DESCRIPTION =
  "Viewing requests and direct conversations between owners and tenants on NakkoBroker.";

export const Route = createFileRoute("/_authenticated/messages/")({
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
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useAuth();
  const { data: conversations, isLoading } = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  });

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <Button asChild variant="ghost" className="rounded-2xl">
          <Link to="/">
            <ArrowLeft className="size-4" /> Back to map
          </Link>
        </Button>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Your chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Viewing requests and replies — owner to tenant, directly.
        </p>

        <section className="mt-6 space-y-3">
          {isLoading ? (
            [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
          ) : conversations?.length ? (
            conversations.map((c) => (
              <Link
                key={c.id}
                to="/messages/$id"
                params={{ id: c.id }}
                className="glass block rounded-2xl p-4 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.listingTitle}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.counterpartName}
                      {c.listingArea ? ` · ${c.listingArea}` : ""}
                      {c.listingCity ? `, ${c.listingCity}` : ""}
                    </p>
                    <p className="mt-1.5 truncate text-sm text-foreground/80">{c.lastMessage}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-brand-foreground">
                      {c.unread}
                    </span>
                  )}
                </div>
              </Link>
            ))
          ) : (
            <div className="glass flex flex-col items-center gap-2 rounded-2xl px-4 py-10 text-center">
              <MessagesSquare className="size-5 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">
                No chats yet. Request a viewing on any home to start one.
              </p>
              <Button asChild className="mt-2 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90">
                <Link to="/">Browse homes</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
