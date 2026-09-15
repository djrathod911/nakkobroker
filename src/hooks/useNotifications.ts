import { useEffect, useId } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchNotifications } from "@/lib/alerts.api";

/**
 * Loads the signed-in user's alert inbox and keeps it live: new matches
 * arrive over realtime the moment a listing or To-Let board is published.
 */
export function useNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();
  // Unique per hook instance: several components subscribe at once and
  // reusing one channel topic makes supabase-js reject the second listener.
  const instanceId = useId();

  const query = useQuery({
    queryKey: ["notifications", userId],
    queryFn: fetchNotifications,
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}-${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { title?: string; body?: string };
          void queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          if (row.title) toast(row.title, { description: row.body });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient, instanceId]);

  const notifications = query.data ?? [];
  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    isLoading: query.isLoading,
  };
}
