import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Eye,
  Loader2,
  Phone,
  ShieldCheck,
  Trash2,
  Plus,
  Trophy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteListing,
  fetchMyListings,
  fetchMyProfile,
  updateMyProfile,
  type MyListingRow,
} from "@/lib/listings.api";
import { HOUSE_TYPES } from "@/lib/list-flat";
import { badgeForPoints } from "@/lib/gamification";
import { fetchListingAnalytics } from "@/lib/listing-analytics.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TITLE = "Your NakkoBroker profile — owner listings & verification";
const DESCRIPTION =
  "Manage your NakkoBroker profile, verified mobile number and your live rental listings. One flat and one villa per number, zero brokerage.";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: () => fetchMyProfile(user!.id),
    enabled: !!user,
  });

  const listings = useQuery({
    queryKey: ["my-listings", user?.id],
    queryFn: () => fetchMyListings(user!.id),
    enabled: !!user,
  });

  const listingIds = (listings.data ?? []).map((r) => r.id);
  const analytics = useQuery({
    queryKey: ["my-listing-analytics", listingIds],
    queryFn: () => fetchListingAnalytics(listingIds),
    enabled: listingIds.length > 0,
  });

  useEffect(() => {
    if (profile.data?.display_name) setName(profile.data.display_name);
  }, [profile.data?.display_name]);

  async function saveName() {
    if (!user) return;
    setSaving(true);
    try {
      await updateMyProfile(user.id, { display_name: name.trim() });
      await queryClient.invalidateQueries({ queryKey: ["my-profile", user.id] });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your profile");
    } finally {
      setSaving(false);
    }
  }

  async function remove(row: MyListingRow) {
    if (!user) return;
    if (!window.confirm(`Remove "${row.title}"? This frees the slot for this city and home type.`)) return;
    try {
      await deleteListing(row.id, user.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-listings", user.id] }),
        queryClient.invalidateQueries({ queryKey: ["listings"] }),
      ]);
      toast.success("Listing removed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove that listing");
    }
  }

  const rows = listings.data ?? [];
  const cities = Array.from(new Set(["Hyderabad", ...rows.map((r) => r.city)]));

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to map
        </Link>

        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          NakkoBroker is owner-to-tenant only. No agents, no brokerage, no listing fees.
        </p>

        <section className="glass mt-6 space-y-4 rounded-3xl p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-brand text-base font-black text-brand-foreground">
              {(profile.data?.display_name ?? "N").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Phone className="size-3.5 text-muted-foreground" aria-hidden />
                {profile.data?.phone ? `+91 ${profile.data.phone}` : "Mobile pending"}
                <BadgeCheck className="size-4 text-teal" aria-label="Verified number" />
              </p>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {profile.data?.points ?? 0} contribution points ·{" "}
                <span className="font-medium text-brand">{badgeForPoints(profile.data?.points ?? 0).tier}</span> ·
                verified mobile account
              </p>
            </div>
            <Button asChild size="sm" variant="secondary" className="ml-auto shrink-0 rounded-xl">
              <Link to="/leaderboard">
                <Trophy className="size-4" /> Leaderboard
              </Link>
            </Button>
          </div>

          <div className="grid gap-2 sm:max-w-sm">
            <Label htmlFor="display-name">Display name</Label>
            <div className="flex gap-2">
              <Input
                id="display-name"
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="How tenants see you"
              />
              <Button onClick={saveName} disabled={saving || !name.trim()} className="rounded-xl">
                {saving && <Loader2 className="size-4 animate-spin" />} Save
              </Button>
            </div>
          </div>

          <p className="flex items-start gap-2 rounded-xl border border-border bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
            Your number is your account. Brokers are kept out by allowing one flat and one villa per number in each
            city.
          </p>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Your listings</h2>
            <Button
              size="sm"
              className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
              onClick={() => navigate({ to: "/list-your-flat" })}
            >
              <Plus className="size-4" /> List a home
            </Button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {cities.map((city) =>
              HOUSE_TYPES.map((type) => {
                const used = rows.some((r) => r.city === city && r.house_type === type && r.status === "published");
                return (
                  <div
                    key={`${city}-${type}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs"
                  >
                    <span className="text-muted-foreground">
                      {city} · {type}
                    </span>
                    <span className={used ? "text-amber-400" : "text-teal"}>{used ? "Slot used" : "Slot free"}</span>
                  </div>
                );
              }),
            )}
          </div>

          {listings.isLoading ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading your listings…</p>
          ) : rows.length === 0 ? (
            <div className="glass mt-4 grid place-items-center gap-2 rounded-3xl p-8 text-center">
              <Building2 className="size-6 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">No listings yet</p>
              <p className="text-xs text-muted-foreground">
                Post your home in five guided steps — tenants call you directly.
              </p>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {rows.map((row) => (
                <li key={row.id} className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{row.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.bhk} BHK {row.house_type} · {row.area}, {row.city} · {inr(row.rent)}/mo · {row.votes} upvotes
                      {row.owner_verified ? " · Owner verified" : ""}
                    </p>
                    <p className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="size-3.5" aria-hidden />{" "}
                        {analytics.data?.[row.id]?.views ?? 0} views
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3.5" aria-hidden />{" "}
                        {analytics.data?.[row.id]?.contactReveals ?? 0} contact reveals
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button asChild size="sm" variant="secondary" className="rounded-xl">
                      <Link to="/listing/$id" params={{ id: row.id }}>
                        View
                      </Link>
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Remove ${row.title}`}
                      className="size-8 rounded-xl text-muted-foreground hover:text-destructive"
                      onClick={() => remove(row)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <Button
          variant="ghost"
          className="mt-6 rounded-xl text-muted-foreground"
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/" });
          }}
        >
          Sign out
        </Button>
      </div>
    </main>
  );
}
