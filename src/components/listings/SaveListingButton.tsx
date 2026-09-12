import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { fetchSavedListingIds, toggleSavedListing } from "@/lib/saved.api";

interface SaveListingButtonProps {
  listingId: string;
  /** Compact icon-only button for cards; `full` shows a labelled button. */
  variant?: "icon" | "full";
  className?: string;
}

/** Heart toggle that saves a home to the tenant dashboard. */
export function SaveListingButton({ listingId, variant = "icon", className }: SaveListingButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: savedIds = [] } = useQuery({
    queryKey: ["saved-listing-ids", user?.id],
    queryFn: () => fetchSavedListingIds(user!.id),
    enabled: !!user,
  });

  const saved = savedIds.includes(listingId);

  const toggle = useMutation({
    mutationFn: () => toggleSavedListing(listingId, user!.id, saved),
    onSuccess: () => {
      toast.success(saved ? "Removed from saved homes" : "Saved — find it in your dashboard");
      void queryClient.invalidateQueries({ queryKey: ["saved-listing-ids", user?.id] });
      void queryClient.invalidateQueries({ queryKey: ["saved-listings", user?.id] });
    },
    onError: () => toast.error("Could not update your saved homes"),
  });

  function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast("Sign in to save homes");
      void navigate({ to: "/auth", search: { next: "/dashboard" } });
      return;
    }
    toggle.mutate();
  }

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="secondary"
        className={cn("rounded-2xl", className)}
        aria-pressed={saved}
        onClick={onClick}
        disabled={toggle.isPending}
      >
        <Heart className={cn("size-4", saved && "fill-brand text-brand")} />
        {saved ? "Saved" : "Save home"}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn("size-8 rounded-full", saved && "bg-brand/15 text-brand", className)}
      aria-label={saved ? "Remove from saved homes" : "Save this home"}
      aria-pressed={saved}
      onClick={onClick}
      disabled={toggle.isPending}
    >
      <Heart className={cn("size-4", saved && "fill-current")} />
    </Button>
  );
}
