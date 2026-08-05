import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Bell, BellRing, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { deleteNotification, markNotificationsRead } from "@/lib/alerts.api";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

export function NotificationBell({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { notifications, unreadCount } = useNotifications(userId);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications", userId] });

  const markRead = useMutation({
    mutationFn: (ids: string[]) => markNotificationsRead(ids),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: invalidate,
  });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      const unread = notifications.filter((n) => !n.read).map((n) => n.id);
      if (unread.length) markRead.mutate(unread);
    }
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="glass relative rounded-2xl border-0"
          aria-label={unreadCount ? `Alerts (${unreadCount} unread)` : "Alerts"}
        >
          {unreadCount ? <BellRing className="size-4" /> : <Bell className="size-4" />}
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[22rem] border-border bg-card/95 p-0 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-semibold tracking-tight">Your alerts</h2>
          {notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markRead.mutate(notifications.filter((n) => !n.read).map((n) => n.id))}
            >
              <CheckCheck className="size-3.5" /> Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              No alerts yet. Save a search from the Filters panel and we&apos;ll ping you the moment a
              matching pin or To-Let board lands.
            </p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "group flex items-start gap-2 border-b border-border/40 px-4 py-3 last:border-0",
                  !n.read && "bg-accent/30",
                )}
              >
                <div className="min-w-0 flex-1">
                  {n.listingId ? (
                    <Link
                      to="/listing/$id"
                      params={{ id: n.listingId }}
                      onClick={() => setOpen(false)}
                      className="text-sm font-medium hover:underline"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium">{n.title}</p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                    {n.kind === "digest" ? "Daily digest" : "Instant match"} ·{" "}
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Dismiss alert"
                  className="size-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => remove.mutate(n.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
