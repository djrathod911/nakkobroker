import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  BellPlus,
  Heart,
  Loader2,
  MessagesSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationBell } from "@/components/alerts/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { fetchConversations } from "@/lib/messages.api";
import { fetchSavedListings, toggleSavedListing } from "@/lib/saved.api";
import {
  createSavedAlert,
  deleteNotification,
  deleteSavedAlert,
  fetchSavedAlerts,
} from "@/lib/alerts.api";
import { RENT_MAX, RENT_MIN, type Filters } from "@/components/listings/FilterPanel";
import { formatRent } from "@/data/listings";

const TITLE = "Your dashboard — NakkoBroker";
const DESCRIPTION =
  "Saved homes, chats with owners and budget alerts for new zero-brokerage rentals in Hyderabad.";

export const Route = createFileRoute("/_authenticated/dashboard")({
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
  component: DashboardPage,
});

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const saved = useQuery({
    queryKey: ["saved-listings", user?.id],
    queryFn: () => fetchSavedListings(user!.id),
    enabled: !!user,
  });
  const chats = useQuery({
    queryKey: ["conversations", user?.id],
    queryFn: () => fetchConversations(user!.id),
    enabled: !!user,
  });
  const alerts = useQuery({
    queryKey: ["saved-alerts", user?.id],
    queryFn: fetchSavedAlerts,
    enabled: !!user,
  });
  const { notifications, unreadCount, isLoading: notificationsLoading } = useNotifications(user?.id);

  const unsave = useMutation({
    mutationFn: (listingId: string) => toggleSavedListing(listingId, user!.id, true),
    onSuccess: () => {
      toast.success("Removed from saved homes");
      void queryClient.invalidateQueries({ queryKey: ["saved-listings", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["saved-listing-ids", user?.id] });
    },
  });

  const removeAlert = useMutation({
    mutationFn: (id: string) => deleteSavedAlert(id),
    onSuccess: () => {
      toast.success("Alert deleted");
      void queryClient.invalidateQueries({ queryKey: ["saved-alerts", user?.id] });
    },
  });

  const removeNotification = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", user?.id] }),
  });

  const unreadChats = (chats.data ?? []).reduce((n, c) => n + c.unread, 0);

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6">
        <Button asChild variant="ghost" className="rounded-2xl">
          <Link to="/">
            <ArrowLeft className="size-4" /> Back to map
          </Link>
        </Button>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Your dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Homes you saved, chats with owners, and alerts for new homes in your budget.
        </p>

        <Tabs defaultValue="saved" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="saved" className="rounded-xl">
              Favourites{saved.data?.length ? ` (${saved.data.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="chats" className="rounded-xl">
              Chats{unreadChats ? ` (${unreadChats})` : ""}
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-xl">
              Alerts{alerts.data?.length ? ` (${alerts.data.length})` : ""}
            </TabsTrigger>
          </TabsList>

          {/* Saved homes */}
          <TabsContent value="saved" className="mt-4 space-y-3">
            {saved.isLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
            ) : saved.data?.length ? (
              saved.data.map((l) => (
                <div key={l.id} className="glass rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to="/listing/$id"
                      params={{ id: l.id }}
                      className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <p className="truncate text-sm font-semibold">{l.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {l.bhk} BHK · {l.furnishing} · {l.area}, {l.city}
                      </p>
                      <p className="mt-1.5 text-base font-bold tracking-tight">
                        {formatRent(l.rent)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">/mo</span>
                      </p>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 rounded-full text-brand"
                      aria-label={`Remove ${l.title} from saved homes`}
                      onClick={() => unsave.mutate(l.id)}
                    >
                      <Heart className="size-4 fill-current" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                icon={<Heart className="size-5 text-muted-foreground" aria-hidden />}
                text="No saved homes yet. Tap the heart on any home to keep it here."
                cta="Browse homes"
              />
            )}
          </TabsContent>

          {/* Chats */}
          <TabsContent value="chats" className="mt-4 space-y-3">
            {chats.isLoading ? (
              [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
            ) : chats.data?.length ? (
              chats.data.map((c) => (
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
                        {c.listingArea ? ` · ${c.listingArea}` : ""} ·{" "}
                        {timeAgo(c.last_message_at)}
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
              <EmptyState
                icon={<MessagesSquare className="size-5 text-muted-foreground" aria-hidden />}
                text="No chats yet. Request a viewing on any home to start one."
                cta="Browse homes"
              />
            )}
          </TabsContent>

          {/* Alerts */}
          <TabsContent value="alerts" className="mt-4 space-y-6">
            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">Your alerts</h2>
              {alerts.isLoading ? (
                [0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
              ) : alerts.data?.length ? (
                alerts.data.map((a) => (
                  <div key={a.id} className="glass flex items-start justify-between gap-3 rounded-2xl p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{a.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[
                          a.bhk.length ? `${a.bhk.join("/")} BHK` : "Any BHK",
                          `under ${formatRent(a.maxRent)}`,
                          a.ownerOnly ? "owners only" : null,
                          ...a.furnishing,
                          ...a.amenities,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {a.instant ? "Instant alerts on" : "Instant alerts off"} ·{" "}
                        {a.dailyDigest ? "daily digest on" : "daily digest off"}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 rounded-full"
                      aria-label={`Delete alert ${a.name}`}
                      onClick={() => removeAlert.mutate(a.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<BellPlus className="size-5 text-muted-foreground" aria-hidden />}
                  text="No alerts yet. Set your budget on the map filters and save the search."
                  cta="Set up an alert"
                />
              )}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold tracking-tight">New matches</h2>
              {notifications.isLoading ? (
                [0, 1].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
              ) : notifications.data?.length ? (
                notifications.data.map((n) => (
                  <div key={n.id} className="glass flex items-start justify-between gap-3 rounded-2xl p-4">
                    <div className="min-w-0">
                      {n.listingId ? (
                        <Link
                          to="/listing/$id"
                          params={{ id: n.listingId }}
                          className="truncate text-sm font-semibold hover:underline"
                        >
                          {n.title}
                        </Link>
                      ) : (
                        <p className="truncate text-sm font-semibold">{n.title}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0 rounded-full"
                      aria-label="Dismiss notification"
                      onClick={() => removeNotification.mutate(n.id)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="glass flex flex-col items-center gap-2 rounded-2xl px-4 py-8 text-center">
                  <Bell className="size-5 text-muted-foreground" aria-hidden />
                  <p className="text-sm text-muted-foreground">
                    No matches yet — we&apos;ll ping you the moment a home fits your budget.
                  </p>
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function EmptyState({ icon, text, cta }: { icon: React.ReactNode; text: string; cta: string }) {
  return (
    <div className="glass flex flex-col items-center gap-2 rounded-2xl px-4 py-10 text-center">
      {icon}
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild className="mt-2 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90">
        <Link to="/">{cta}</Link>
      </Button>
    </div>
  );
}
