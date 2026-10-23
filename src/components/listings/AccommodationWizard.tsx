import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { AddressSearch } from "@/components/list-flat/AddressSearch";
import { PinPicker } from "@/components/list-flat/PinPicker";
import { CITIES, AMENITIES, FURNISHING, PARKING } from "@/lib/list-flat";
import { defaultAreaFor } from "@/lib/cities";
import { signedPhotoUrls } from "@/lib/listings.api";
import {
  accommodationProperties,
  loadAccommodation,
  saveAccommodation,
} from "@/lib/accommodation.api";
import {
  accommodationTypes,
  emptySharedDraft,
  rentSummary,
  sharedDraftSchema,
  type SharedDraft,
  type SharedDetails,
} from "@/lib/accommodation";
import { formatRent } from "@/data/listings";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <select
        aria-label={label}
        className="h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {(
              {
                tenant: "Existing tenant",
                owner: "Property owner",
                provider: "Authorised accommodation provider",
                available: "Available immediately",
                available_soon: "Available from a future date",
                occupied: "Currently occupied",
              } as Record<string, string>
            )[o] ?? o}
          </option>
        ))}
      </select>
    </Field>
  );
}
const sampleDescription =
  "Hey! I’m currently living in a fully furnished 2BHK in Indiranagar. My previous flatmate has moved out, so I’m looking for a working professional to occupy the vacant bedroom and share the rent and utilities. The apartment has a fully equipped kitchen, a spacious living room, and easy access to supermarkets, cafes, and offices. Looking for someone responsible who wants a comfortable place to live without paying the rent for an entire flat alone.";

export function AccommodationWizard({
  category,
  editId,
}: {
  category: "flatmate" | "room_bed";
  editId?: string | undefined;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<SharedDraft>({ ...emptySharedDraft, category });
  const [id, setId] = useState<string | undefined>(editId);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const edit = useQuery({
    queryKey: ["edit-accommodation", editId],
    queryFn: () => loadAccommodation(editId ?? ""),
    enabled: !!editId,
  });
  const properties = useQuery({
    queryKey: ["accommodation-properties", user?.id],
    queryFn: accommodationProperties,
    enabled: !!user,
  });
  useEffect(() => {
    if (edit.data) setDraft(edit.data);
  }, [edit.data]);
  useEffect(() => {
    let alive = true;
    signedPhotoUrls(draft.photos).then((urls) => {
      if (alive) setPhotoUrls(urls);
    });
    return () => {
      alive = false;
    };
  }, [draft.photos]);
  const steps =
    category === "flatmate"
      ? [
          "Your flat",
          "Accommodation",
          "Rent split",
          "Flatmates",
          "Description",
          "Permissions",
          "Preview",
        ]
      : ["Accommodation", "Rent & expenses", "Household & details", "Permissions", "Preview"];
  const current = category === "flatmate" ? step : ([0, 2, 4, 5, 6][step] ?? 0);
  const patch = (p: Partial<SharedDraft>) => setDraft((d) => ({ ...d, ...p }));
  const detail = (p: Partial<SharedDetails>) =>
    setDraft((d) => ({ ...d, details: { ...d.details, ...p } }));
  const input = (
    key: "title" | "area" | "availableDate" | "description",
    label: string,
    type = "text",
  ) => (
    <Field label={label}>
      <Input
        className="h-11"
        aria-label={label}
        type={type}
        value={draft[key]}
        onChange={(e) => patch({ [key]: e.target.value })}
      />
    </Field>
  );
  const number = (
    key:
      "bedrooms" | "bathrooms" | "floor" | "totalRent" | "contribution" | "deposit" | "maintenance",
    label: string,
  ) => (
    <Field label={label}>
      <Input
        className="h-11"
        aria-label={label}
        type="number"
        min={0}
        value={draft[key]}
        onChange={(e) => patch({ [key]: Number(e.target.value) })}
      />
    </Field>
  );
  const textDetail = (key: keyof SharedDetails, label: string) => (
    <Field label={label}>
      <Input
        className="h-11"
        aria-label={label}
        value={String(draft.details[key] ?? "")}
        onChange={(e) => detail({ [key]: e.target.value })}
      />
    </Field>
  );
  const check = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm">
      <Checkbox
        aria-label={label}
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
      />
      <span>{label}</span>
    </label>
  );
  const summary = rentSummary(
    draft.totalRent,
    draft.contribution,
    draft.maintenance,
    draft.details,
  );
  async function save(status: "draft" | "published") {
    setBusy(true);
    setError("");
    try {
      const savedId = await saveAccommodation(draft, status, id);
      setId(savedId);
      const saved = await loadAccommodation(savedId);
      setDraft(saved);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["listings"] }),
        qc.invalidateQueries({ queryKey: ["my-listings"] }),
        qc.invalidateQueries({ queryKey: ["accommodation-properties"] }),
      ]);
      if (status === "published") setPublished(true);
      else toast.success("Draft saved — photos and details are preserved");
      return true;
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e && "message" in e
            ? String(e.message)
            : "Could not save your listing";
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function next() {
    if (current === 0 && (!draft.area.trim() || draft.bedrooms < 1 || draft.bathrooms < 1)) {
      setError("Add a locality, at least one bedroom and bathroom");
      return;
    }
    if (current === 1 && draft.availability === "available_soon" && !draft.availableDate) {
      setError("Choose a move-in date");
      return;
    }
    if (current === 2 && (draft.contribution <= 0 || draft.totalRent < 0 || draft.deposit < 0)) {
      setError("Enter a positive monthly contribution and non-negative rent and deposit");
      return;
    }
    if (
      current === 5 &&
      draft.relationship === "tenant" &&
      (!draft.permission || !draft.declaration)
    ) {
      setError("Confirm your tenancy and permissions before continuing");
      return;
    }
    if (await save("draft")) {
      setStep((s) => Math.min(s + 1, steps.length - 1));
      window.scrollTo({ top: 0 });
    }
  }
  async function upload(files: FileList | null, label: string) {
    if (!files || !user) return;
    setBusy(true);
    const paths: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024)
          throw new Error("Choose photos smaller than 10 MB");
        const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        const { error: uploadError } = await supabase.storage
          .from("listing-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        paths.push(path);
      }
      const updated = {
        ...draft,
        photos: [...draft.photos, ...paths],
        details: {
          ...draft.details,
          photo_labels: [
            ...(draft.details.photo_labels ?? draft.photos.map(() => "Room")),
            ...paths.map(() => label),
          ],
        },
      };
      const savedId = await saveAccommodation(updated, "draft", id);
      setId(savedId);
      setDraft(await loadAccommodation(savedId));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photos");
      if (paths.length) await supabase.storage.from("listing-photos").remove(paths);
    } finally {
      setBusy(false);
    }
  }
  const accommodationChoices = (
    <div className="space-y-3">
      <Label>What type of accommodation is available?</Label>
      <div className="grid gap-2 sm:grid-cols-3">
        {(["private_room", "shared_room", "bed"] as const).map((t) => (
          <Button
            key={t}
            variant={draft.accommodation === t ? "default" : "outline"}
            aria-pressed={draft.accommodation === t}
            className="h-auto min-h-14 whitespace-normal"
            onClick={() => patch({ accommodation: t })}
          >
            {accommodationTypes[t]}
          </Button>
        ))}
      </div>
    </div>
  );
  const photos = (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {["Room", "Common area"].map((label) => (
          <Field key={label} label={`${label} photographs`}>
            <Input
              aria-label={`${label} photographs`}
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              onChange={(e) => void upload(e.target.files, label)}
            />
          </Field>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {draft.photos.map((path, i) => (
          <div key={path} className="relative">
            <img
              src={photoUrls[i]}
              alt={draft.details.photo_labels?.[i] ?? "Accommodation"}
              className="aspect-[4/3] w-full rounded-lg object-cover"
            />
            <span className="text-xs text-muted-foreground">
              {draft.details.photo_labels?.[i] ?? "Room"}
            </span>
            <Button
              size="icon"
              variant="secondary"
              aria-label={`Remove photo ${i + 1}`}
              className="absolute right-1 top-1"
              onClick={() => {
                patch({
                  photos: draft.photos.filter((p) => p !== path),
                  details: {
                    ...draft.details,
                    photo_labels: (draft.details.photo_labels ?? []).filter((_, n) => n !== i),
                  },
                });
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
  if (edit.isLoading) return <main className="p-8 text-center">Loading your room…</main>;
  if (edit.error)
    return (
      <main className="p-8 text-center">
        <p>This listing could not be loaded for editing.</p>
        <Button asChild variant="outline">
          <Link to="/profile">My Listings</Link>
        </Button>
      </main>
    );
  if (published && id)
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center">
        <Check className="mx-auto size-12 text-success" />
        <h1 className="mt-5 text-2xl font-semibold">Your room is now listed on Nakkobroker!</h1>
        <p className="mt-3 text-muted-foreground">
          Your next flatmate could be just around the corner. Share your listing and connect
          directly with people looking for a place to stay.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/listing/$id" params={{ id }}>
              View listing
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              const url = `${window.location.origin}/listing/${id}`;
              if (navigator.share) await navigator.share({ url, title: draft.title });
              else {
                await navigator.clipboard.writeText(url);
                toast.success("Link copied");
              }
            }}
          >
            <Share2 className="size-4" />
            Share
          </Button>
          <Button variant="secondary" asChild>
            <Link to="/profile">My Listings</Link>
          </Button>
        </div>
      </main>
    );
  return (
    <main className="min-h-dvh bg-background px-4 py-7">
      <div className="mx-auto max-w-3xl">
        <Button asChild variant="ghost">
          <Link to="/list-your-flat">
            <ArrowLeft className="size-4" />
            Listing categories
          </Link>
        </Button>
        <h1 className="mt-5 text-2xl font-semibold">
          {editId
            ? "Edit your accommodation"
            : category === "flatmate"
              ? "Find a Flatmate"
              : "Offer a Room or Bed"}
        </h1>
        <div className="mt-5 flex items-center justify-between text-sm">
          <span>
            Step {step + 1} of {steps.length} · {steps[step]}
          </span>
          {id && <span className="text-muted-foreground">Draft saved</span>}
        </div>
        <Progress className="mt-2" value={((step + 1) / steps.length) * 100} />
        <div className="mt-3 flex gap-1 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <Button
              key={s}
              size="sm"
              variant={i === step ? "secondary" : "ghost"}
              disabled={i > step || busy}
              onClick={() => setStep(i)}
            >
              {i + 1}
            </Button>
          ))}
        </div>
        <section className="mt-6 space-y-6">
          {current === 0 && (
            <>
              <h2 className="text-xl font-semibold">Where are you currently staying?</h2>
              {category === "room_bed" && (
                <>
                  {accommodationChoices}
                  <Choice
                    label="Your relationship to the property"
                    value={draft.relationship}
                    options={["tenant", "owner", "provider"]}
                    onChange={(v) => patch({ relationship: v as SharedDraft["relationship"] })}
                  />
                </>
              )}
              {!!properties.data?.length && (
                <Field label="Use an existing property">
                  <select
                    aria-label="Use an existing property"
                    className="h-11 w-full rounded-lg border border-input bg-background px-3"
                    value={draft.propertyId}
                    onChange={(e) => {
                      const p = properties.data?.find((v) => v.id === e.target.value);
                      const d = p?.details as
                        | {
                            city?: string;
                            area?: string;
                            building_name?: string;
                            bhk?: number;
                            bathrooms?: number;
                          }
                        | undefined;
                      patch({
                  propertyId: p?.existingListingId ? "" : e.target.value,
                  existingListingId: p?.existingListingId ?? "",
                        ...(d
                          ? {
                              city: d.city ?? draft.city,
                              area: d.area ?? draft.area,
                              bedrooms: d.bhk ?? draft.bedrooms,
                              bathrooms: d.bathrooms ?? draft.bathrooms,
                              details: { ...draft.details, building_name: d.building_name ?? "" },
                            }
                          : {}),
                      });
                    }}
                  >
                    <option value="">New property</option>
                    {properties.data.map((p) => {
                      const d = p.details as { area?: string; building_name?: string };
                      return (
                        <option key={p.id} value={p.id}>
                          {d.building_name || d.area || "My property"}
                        </option>
                      );
                    })}
                  </select>
                </Field>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Choice
                  label="City"
                  value={draft.city}
                  options={CITIES}
                  onChange={(city) => {
                    const location = defaultAreaFor(city);
                    patch({ city, area: location.area, lng: location.lng, lat: location.lat });
                  }}
                />
                {input("area", "Locality or neighbourhood")}
                {textDetail("building_name", "Apartment or building name")}
                {number("bedrooms", "Total bedrooms / BHK")}
                {number("bathrooms", "Bathrooms")}
                {number("floor", "Floor (optional)")}
                <Choice
                  label="Flat furnishing"
                  value={draft.furnishing}
                  options={FURNISHING}
                  onChange={(v) => patch({ furnishing: v as SharedDraft["furnishing"] })}
                />
                <Choice
                  label="Parking"
                  value={draft.parking}
                  options={PARKING}
                  onChange={(parking) => patch({ parking })}
                />
              </div>
              <AddressSearch city={draft.city} onPick={(lng, lat) => patch({ lng, lat })} />
              <PinPicker
                lng={draft.lng}
                lat={draft.lat}
                onChange={(lng, lat) => patch({ lng, lat })}
              />
              <div className="flex flex-wrap gap-2">
                {AMENITIES.map((a) => (
                  <Button
                    key={a}
                    variant={draft.amenities.includes(a) ? "secondary" : "outline"}
                    aria-pressed={draft.amenities.includes(a)}
                    onClick={() =>
                      patch({
                        amenities: draft.amenities.includes(a)
                          ? draft.amenities.filter((x) => x !== a)
                          : [...draft.amenities, a],
                      })
                    }
                  >
                    {a}
                  </Button>
                ))}
              </div>
              {category === "room_bed" && (
                <>
                  {input("availableDate", "Available-from date", "date")}
                  <Choice
                    label="Availability"
                    value={draft.availability}
                    options={["available", "available_soon", "occupied"]}
                    onChange={(v) => patch({ availability: v as SharedDraft["availability"] })}
                  />
                  <Choice
                    label="Bathroom type"
                    value={draft.details.bathroom_type ?? "Shared"}
                    options={["Shared", "Attached"]}
                    onChange={(bathroom_type) => detail({ bathroom_type })}
                  />
                  {photos}
                </>
              )}
            </>
          )}
          {current === 1 && (
            <>
              <h2 className="text-xl font-semibold">What are you offering your future flatmate?</h2>
              {accommodationChoices}
              <div className="grid gap-4 sm:grid-cols-2">
                <Choice
                  label="Availability"
                  value={draft.availability}
                  options={["available", "available_soon", "occupied"]}
                  onChange={(v) => patch({ availability: v as SharedDraft["availability"] })}
                />
                {input("availableDate", "Expected move-in date", "date")}
                <Choice
                  label="Bathroom type"
                  value={draft.details.bathroom_type ?? "Shared"}
                  options={["Shared", "Attached"]}
                  onChange={(bathroom_type) => detail({ bathroom_type })}
                />
                {textDetail("room_furnishing", "Room furniture")}
              </div>
              {check("Wardrobe or storage available", !!draft.details.wardrobe, (wardrobe) =>
                detail({ wardrobe }),
              )}
              {photos}
            </>
          )}
          {current === 2 && (
            <>
              <h2 className="text-xl font-semibold">Let’s split the rent fairly.</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {number("totalRent", "Total monthly flat rent")}
                {number("contribution", "Incoming flatmate’s monthly contribution")}
                {number("deposit", "Security deposit contribution")}
                {number("maintenance", "Monthly maintenance contribution")}
                {(["electricity", "water", "internet", "other"] as const).map((key) => (
                  <Field
                    key={key}
                    label={`${key[0]?.toUpperCase()}${key.slice(1)} contribution / month`}
                  >
                    <Input
                      aria-label={`${key} contribution`}
                      type="number"
                      min={0}
                      value={draft.details[key] ?? 0}
                      onChange={(e) => detail({ [key]: Number(e.target.value) })}
                    />
                  </Field>
                ))}
              </div>
              {check(
                "Utilities included in monthly contribution",
                !!draft.details.utilities_included,
                (utilities_included) => detail({ utilities_included }),
              )}
              {check("Display total flat rent publicly", draft.discloseTotal, (discloseTotal) =>
                patch({ discloseTotal }),
              )}
              <dl className="space-y-3 border-y border-border py-5">
                {[
                  ["Total monthly flat rent", draft.totalRent],
                  ["Remaining rent for existing occupants", summary.remainingRent],
                  ["Incoming flatmate’s contribution", draft.contribution],
                  ["Security deposit contribution", draft.deposit],
                  ["Estimated incoming monthly total", summary.monthlyTotal],
                ].map(([label, amount]) => (
                  <div key={label} className="flex flex-wrap justify-between gap-2">
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-semibold">{formatRent(Number(amount))}</dd>
                  </div>
                ))}
                <div className="text-sm text-muted-foreground">
                  Utilities:{" "}
                  {draft.details.utilities_included
                    ? "Included"
                    : "Shared separately; estimates shown above"}
                </div>
              </dl>
              <p className="text-xs text-muted-foreground">
                A contribution does not establish a separate lease or tenancy agreement.
              </p>
            </>
          )}
          {(current === 3 || (category === "room_bed" && current === 4)) && (
            <>
              <h2 className="text-xl font-semibold">Who will the new flatmate be living with?</h2>
              <Field label="Existing occupants">
                <Input
                  aria-label="Existing occupants"
                  type="number"
                  min={0}
                  value={draft.details.existing_occupants ?? 0}
                  onChange={(e) => detail({ existing_occupants: Number(e.target.value) })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                {textDetail("introduction", "Brief household introduction")}
                {textDetail("occupation", "Occupation preference (optional)")}
                {textDetail("gender", "Gender preference (optional)")}
                {textDetail("lifestyle", "Lifestyle preferences")}
                {textDetail("smoking", "Smoking preferences")}
                {textDetail("food", "Food preferences")}
                {textDetail("pets", "Pet preferences")}
                <Choice
                  label="Household atmosphere"
                  value={draft.details.household ?? "No preference"}
                  options={["No preference", "Quiet", "Social"]}
                  onChange={(household) => detail({ household })}
                />
                {textDetail("rules", "House rules and additional preferences")}
              </div>
            </>
          )}
          {current === 4 && (
            <>
              <h2 className="text-xl font-semibold">
                Give your future flatmate a feel for the place.
              </h2>
              {input("title", "Listing title")}
              <Field label="Living arrangement">
                <Textarea
                  aria-label="Living arrangement"
                  rows={7}
                  placeholder={sampleDescription}
                  value={draft.description}
                  onChange={(e) => patch({ description: e.target.value })}
                />
              </Field>
              <Button variant="ghost" onClick={() => patch({ description: sampleDescription })}>
                Use sample description
              </Button>
              {textDetail("landmarks", "Nearby landmarks and workplaces")}
              {textDetail("rules", "House rules")}
              <Choice
                label="Contact preference"
                value={draft.details.contact_preference ?? "In-app messages"}
                options={["In-app messages"]}
                onChange={(contact_preference) => detail({ contact_preference })}
              />
            </>
          )}
          {current === 5 && (
            <>
              <h2 className="text-xl font-semibold">A quick check before publishing.</h2>
              {draft.relationship === "tenant" ? (
                <>
                  {check(
                    "I confirm that I am currently residing in this property and that I have the necessary permission, where required, to offer the room or shared accommodation to another occupant.",
                    draft.declaration,
                    (declaration) => patch({ declaration }),
                  )}
                  <Field label="Have you checked whether your rental agreement or landlord requires permission for an additional occupant?">
                    <div className="space-y-2">
                      {[
                        ["confirmed", "Yes, permission is confirmed."],
                        ["not_required", "Permission is not required, as far as I know."],
                        ["pending", "I need to confirm with my landlord."],
                      ].map(([value, label]) => (
                        <Button
                          key={value}
                          className="h-auto min-h-11 w-full justify-start whitespace-normal text-left"
                          variant={draft.permission === value ? "secondary" : "outline"}
                          aria-pressed={draft.permission === value}
                          onClick={() => patch({ permission: value as SharedDraft["permission"] })}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </Field>
                  <p className="text-sm text-muted-foreground">
                    This is your declaration, not legal or owner verification. If permission is
                    required, obtain it before offering occupancy.
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Listed by{" "}
                  {draft.relationship === "owner"
                    ? "a property owner"
                    : "an authorised accommodation provider"}
                  . No ownership verification is implied.
                </p>
              )}
            </>
          )}
          {current === 6 && (
            <>
              <h2 className="text-xl font-semibold">Preview & publish</h2>
              {input("title", "Listing title")}
              <div className="border-y border-border py-6">
                <p className="text-sm text-teal">
                  {category === "flatmate" ? "Looking for a Flatmate" : "Room or Bed Available"} ·{" "}
                  {draft.relationship === "tenant"
                    ? "Tenant-created"
                    : draft.relationship === "owner"
                      ? "Owner-created"
                      : "Accommodation provider"}
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  {draft.title ||
                    `${accommodationTypes[draft.accommodation]} in a ${draft.bedrooms}BHK`}
                </h3>
                <p className="mt-1 text-muted-foreground">
                  {draft.area}, {draft.city}
                </p>
                <p className="mt-4 text-2xl font-bold">
                  {formatRent(draft.contribution)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {" "}
                    /month contribution
                  </span>
                </p>
                <p className="mt-2 text-sm">
                  Deposit {formatRent(draft.deposit)} ·{" "}
                  {draft.details.utilities_included ? "Utilities included" : "Utilities separate"}
                </p>
                {draft.discloseTotal && (
                  <p className="mt-2 text-sm">
                    Total flat rent: {formatRent(draft.totalRent)}/month
                  </p>
                )}
                <p className="mt-3 text-sm">
                  {accommodationTypes[draft.accommodation]} · {draft.furnishing} ·{" "}
                  {draft.details.bathroom_type} bathroom · {draft.details.existing_occupants ?? 0}{" "}
                  existing occupants
                </p>
                <p className="mt-2 text-sm">
                  {draft.availability === "occupied"
                    ? "Currently occupied"
                    : draft.availableDate
                      ? `Available from ${draft.availableDate}`
                      : "Available immediately"}
                </p>
                <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
                  {draft.description}
                </p>
                <p className="mt-3 text-sm">{draft.amenities.join(" · ")}</p>
                <p className="mt-3 text-sm">
                  {Object.entries(draft.details)
                    .filter(
                      ([key, value]) =>
                        [
                          "introduction",
                          "occupation",
                          "gender",
                          "lifestyle",
                          "smoking",
                          "food",
                          "pets",
                          "household",
                          "rules",
                        ].includes(key) && value,
                    )
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" · ")}
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Contact through in-app messages
                </p>
              </div>
              {photos}
              <Button variant="outline" onClick={() => setStep(0)}>
                Edit listing
              </Button>
            </>
          )}
        </section>
        {error && (
          <p role="alert" className="mt-5 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
          <Button
            variant="ghost"
            disabled={step === 0 || busy}
            onClick={() => setStep((s) => s - 1)}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void save("draft")}>
              Save as Draft
            </Button>
            <Button
              disabled={busy}
              onClick={() => {
                if (current === 6) {
                  const parsed = sharedDraftSchema.safeParse(draft);
                  if (!parsed.success) {
                    setError(parsed.error.issues[0]?.message ?? "Check your listing");
                    return;
                  }
                  void save("published");
                } else void next();
              }}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : current === 6 ? (
                <Check className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {current === 6 ? "Publish Listing" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
