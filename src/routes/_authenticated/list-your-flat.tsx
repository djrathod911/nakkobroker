import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate, Link, useBlocker } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  MapPin,
  PartyPopper,
  Star,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { createListing, fetchVerifiedPhones } from "@/lib/listings.api";
import {
  AMENITIES,
  AREAS,
  AVAILABILITY,
  CITIES,
  FACING,
  FURNISHING,
  HOUSE_TYPES,
  PARKING,

  STEPS,
  TENANTS,
  clearDraft,
  completeness,
  emptyDraft,
  loadDraft,
  priceHint,
  normalizeIndianPhone,
  saveDraft,
  stepSchemas,
  type FlatDraft,
} from "@/lib/list-flat";
import { PinPicker } from "@/components/list-flat/PinPicker";
import { OwnerVerification } from "@/components/list-flat/OwnerVerification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const TITLE = "List your flat free — NakkoBroker Hyderabad";
const DESCRIPTION =
  "Post your Hyderabad flat directly to tenants on NakkoBroker in five guided steps. No brokers, no brokerage, photos and map pin included.";

export const Route = createFileRoute("/_authenticated/list-your-flat")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ListYourFlat,
});

interface Photo {
  id: string;
  file: File;
  url: string;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function ListYourFlat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<FlatDraft>(emptyDraft);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploaded, setUploaded] = useState({ done: 0, total: 0 });
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const dropRef = useRef<HTMLLabelElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [verifiedPhones, setVerifiedPhones] = useState<string[]>([]);

  // Owner verification is optional: we only surface which numbers are already confirmed.
  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      fetchVerifiedPhones(data.user.id)
        .then((rows) => alive && setVerifiedPhones(rows))
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Restore an in-progress draft so a refresh never loses the owner's work.
  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      setDraft(saved);
      toast.info("Restored your saved draft");
    }
  }, []);

  useEffect(() => {
    if (dirty && !publishedId) saveDraft(draft);
  }, [draft, dirty, publishedId]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), [photos]);

  useBlocker({
    shouldBlockFn: () => dirty && !publishedId && !busy,
    enableBeforeUnload: () => dirty && !publishedId,
  });

  const set = useCallback((patch: Partial<FlatDraft>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, ...patch }));
  }, []);

  const num = (key: keyof FlatDraft) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set({ [key]: Number(e.target.value) } as Partial<FlatDraft>);

  const phoneVerified = useMemo(() => {
    const n = normalizeIndianPhone(draft.contact_phone);
    return !!n && verifiedPhones.includes(n);
  }, [draft.contact_phone, verifiedPhones]);

  const progress = useMemo(() => completeness(draft, photos.length), [draft, photos.length]);
  const hint = useMemo(() => priceHint(draft), [draft]);

  function validate(index: number) {
    const schema = stepSchemas[index];
    if (!schema) return true;
    const parsed = schema.safeParse(draft);
    if (parsed.success) {
      setErrors({});
      return true;
    }
    const next: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      next[key] ??= issue.message;
    }
    setErrors(next);
    toast.error(Object.values(next)[0] ?? "Check the highlighted fields");
    return false;
  }

  function goNext() {
    if (!validate(step)) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goTo(index: number) {
    if (index <= step) {
      setErrors({});
      setStep(index);
      return;
    }
    for (let i = step; i < index; i++) if (!validate(i)) return;
    setStep(index);
  }

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!incoming.length) return;
    setDirty(true);
    setPhotos((prev) => {
      const room = 6 - prev.length;
      if (room <= 0) {
        toast.error("You can upload up to 6 photos");
        return prev;
      }
      const added = incoming.slice(0, room).map((file) => ({
        id: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      }));
      if (incoming.length > room) toast.info(`Added ${room} photo(s) — 6 is the limit`);
      return [...prev, ...added];
    });
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function makeCover(id: string) {
    setPhotos((prev) => {
      const target = prev.find((p) => p.id === id);
      if (!target) return prev;
      return [target, ...prev.filter((p) => p.id !== id)];
    });
  }

  async function publish() {
    for (let i = 0; i < STEPS.length; i++) if (!validate(i)) return setStep(i);
    setBusy(true);
    setUploaded({ done: 0, total: photos.length });
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Your session expired — please sign in again");
      const id = await createListing(
        {
          title: draft.title.trim(),
          description: draft.description.trim(),
          city: draft.city,
          house_type: draft.house_type,
          area: draft.area,
          bhk: draft.bhk,
          bathrooms: draft.bathrooms,
          balconies: draft.balconies,
          floor: draft.floor,
          total_floors: draft.total_floors,
          parking: draft.parking,
          facing: draft.facing,
          rent: draft.rent,
          deposit: draft.deposit,
          maintenance: draft.maintenance,
          negotiable: draft.negotiable,
          furnishing: draft.furnishing,
          tenant: draft.tenant,
          metro_km: draft.metro_km,
          it_corridor_km: draft.it_corridor_km,
          sqft: draft.sqft,
          available_from: draft.available_from.trim(),
          amenities: draft.amenities,
          contact_phone: draft.contact_phone.trim() || null,
          lng: draft.lng,
          lat: draft.lat,
          source: "Owner",
        },

        auth.user.id,
        photos.map((p) => p.file),
        (done, total) => setUploaded({ done, total }),
      );
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      clearDraft();
      setDirty(false);
      setPublishedId(id);
      toast.success("Your flat is live — zero brokerage!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish listing");
    } finally {
      setBusy(false);
    }
  }

  if (publishedId) {
    return (
      <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass w-full max-w-md rounded-3xl p-7 text-center"
        >
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand/15 text-brand">
            <PartyPopper className="size-7" />
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Your flat is live</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {draft.bhk} BHK in {draft.area} at {inr(draft.rent)}/month is now on the map. Tenants matching saved alerts
            have already been notified.
          </p>
          <div className="mt-6 grid gap-2">
            <Button asChild className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to="/listing/$id" params={{ id: publishedId }}>
                View your listing
              </Link>
            </Button>
            <Button variant="secondary" className="rounded-xl" onClick={() => navigate({ to: "/" })}>
              Back to map
            </Button>
            <Button
              variant="ghost"
              className="rounded-xl text-muted-foreground"
              onClick={() => {
                setPublishedId(null);
                setDraft(emptyDraft);
                setPhotos([]);
                setStep(0);
              }}
            >
              List another flat
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  const current = STEPS[step]!;

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to map
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">List your flat</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Free forever. Tenants contact you directly — no brokers in between.
            </p>
          </div>
          <div className="min-w-40">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Listing strength</span>
              <span className="font-medium text-foreground">{progress}%</span>
            </div>
            <Progress value={progress} className="mt-1.5 h-1.5" />
          </div>
        </div>

        {/* Stepper */}
        <ol className="mt-6 flex items-center gap-1.5 overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex min-w-fit items-center gap-1.5">
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-current={i === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                  i === step
                    ? "border-transparent bg-brand text-brand-foreground glow-ring"
                    : i < step
                      ? "border-border bg-secondary/60 text-foreground"
                      : "border-border/60 bg-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="grid size-4 place-items-center rounded-full bg-background/25 text-[10px]">
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                {s.label}
              </button>
              {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
            </li>
          ))}
        </ol>

        <AnimatePresence mode="wait">
          <motion.section
            key={current.key}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="glass mt-5 space-y-6 rounded-3xl p-5"
          >
            <header>
              <h2 className="text-base font-semibold tracking-tight">{current.label}</h2>
              <p className="text-xs text-muted-foreground">{current.hint}</p>
            </header>

            {step === 0 && (
              <>
                <PillGroup
                  label="City"
                  required
                  options={CITIES}
                  value={draft.city}
                  onChange={(v) => set({ city: v })}
                  error={errors["city"]}
                />
                <PillGroup
                  label="Home type"
                  required
                  options={[...HOUSE_TYPES]}
                  value={draft.house_type}
                  onChange={(v) => set({ house_type: v })}
                  hint="One mobile number can keep one flat and one villa live per city — that keeps brokers off NakkoBroker."
                  error={errors["house_type"]}
                />
                <div className="space-y-2">
                  <FieldLabel required>Area</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(AREAS).map((a) => (
                      <Pill
                        key={a}
                        label={a}
                        active={draft.area === a}
                        onClick={() => {
                          const c = AREAS[a]!;
                          set({ area: a, lng: c[0], lat: c[1] });
                        }}
                      />
                    ))}
                  </div>
                  <FieldError message={errors["area"]} />
                </div>
                <PinPicker lng={draft.lng} lat={draft.lat} onChange={(lng, lat) => set({ lng, lat })} />
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" /> Pin at {draft.lat.toFixed(4)}, {draft.lng.toFixed(4)}
                </p>
              </>
            )}

            {step === 1 && (
              <>
                <div
                  className={cn(
                    "space-y-1.5",
                    errors["title"] && "[&_textarea]:border-destructive [&_textarea]:ring-1 [&_textarea]:ring-destructive/40",
                  )}
                >
                  <FieldLabel htmlFor="title" required>
                    Listing title
                  </FieldLabel>
                  <Textarea
                    id="title"
                    rows={2}
                    maxLength={120}
                    placeholder="Airy 2BHK with balcony views"
                    value={draft.title}
                    onChange={(e) => set({ title: e.target.value })}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <FieldError message={errors["title"]} />
                    <span>{draft.title.length}/120</span>
                  </div>
                </div>

                <div
                  className={cn(
                    "space-y-1.5",
                    errors["description"] &&
                      "[&_textarea]:border-destructive [&_textarea]:ring-1 [&_textarea]:ring-destructive/40",
                  )}
                >
                  <FieldLabel htmlFor="description" required>
                    About this home
                  </FieldLabel>
                  <Textarea
                    id="description"
                    rows={4}
                    maxLength={2000}
                    placeholder="Layout, natural light, water supply, nearby markets and schools, house rules…"
                    value={draft.description}
                    onChange={(e) => set({ description: e.target.value })}
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <FieldError message={errors["description"]} />
                    <span>{draft.description.length}/2000</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <Field label="BHK" id="bhk" required error={errors["bhk"]}>
                    <Input id="bhk" type="number" min={1} max={6} value={draft.bhk} onChange={num("bhk")} />
                  </Field>
                  <Field label="Bathrooms" id="bathrooms" required error={errors["bathrooms"]}>
                    <Input id="bathrooms" type="number" min={1} max={10} value={draft.bathrooms} onChange={num("bathrooms")} />
                  </Field>
                  <Field label="Balconies" id="balconies" error={errors["balconies"]}>
                    <Input id="balconies" type="number" min={0} max={10} value={draft.balconies} onChange={num("balconies")} />
                  </Field>
                  <Field label="Floor" id="floor" required error={errors["floor"]}>
                    <Input id="floor" type="number" min={0} value={draft.floor} onChange={num("floor")} />
                  </Field>
                  <Field label="Total floors" id="total_floors" error={errors["total_floors"]}>
                    <Input
                      id="total_floors"
                      type="number"
                      min={0}
                      value={draft.total_floors}
                      onChange={num("total_floors")}
                    />
                  </Field>
                  <Field label="Carpet area (sqft)" id="sqft" required error={errors["sqft"]}>
                    <Input id="sqft" type="number" min={100} value={draft.sqft} onChange={num("sqft")} />
                  </Field>
                  <Field label="Metro (km)" id="metro" error={errors["metro_km"]}>
                    <Input id="metro" type="number" step="0.1" min={0} value={draft.metro_km} onChange={num("metro_km")} />
                  </Field>
                  <Field label="IT corridor (km)" id="itc" error={errors["it_corridor_km"]}>
                    <Input
                      id="itc"
                      type="number"
                      step="0.1"
                      min={0}
                      value={draft.it_corridor_km}
                      onChange={num("it_corridor_km")}
                    />
                  </Field>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <PillGroup
                    label="Parking"
                    required
                    options={PARKING}
                    value={draft.parking}
                    onChange={(v) => set({ parking: v })}
                    error={errors["parking"]}
                  />
                  <PillGroup
                    label="Facing"
                    required
                    options={FACING}
                    value={draft.facing}
                    onChange={(v) => set({ facing: v })}
                    error={errors["facing"]}
                  />
                  <PillGroup
                    label="Furnishing"
                    required
                    options={FURNISHING}
                    value={draft.furnishing}
                    onChange={(v) => set({ furnishing: v })}
                    error={errors["furnishing"]}
                  />
                  <PillGroup
                    label="Preferred tenant"
                    required
                    options={TENANTS}
                    value={draft.tenant}
                    onChange={(v) => set({ tenant: v })}
                    error={errors["tenant"]}
                  />
                </div>
                <PillGroup
                  label="Available from"
                  required
                  options={AVAILABILITY}
                  value={draft.available_from}
                  onChange={(v) => set({ available_from: v })}
                  error={errors["available_from"]}
                />

                <div className="space-y-2">
                  <FieldLabel>Amenities</FieldLabel>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((a) => (
                      <Pill
                        key={a}
                        label={a}
                        active={draft.amenities.includes(a)}
                        onClick={() =>
                          set({
                            amenities: draft.amenities.includes(a)
                              ? draft.amenities.filter((x) => x !== a)
                              : [...draft.amenities, a],
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field label="Monthly rent (₹)" id="rent" required error={errors["rent"]}>
                    <Input id="rent" type="number" min={1000} value={draft.rent} onChange={num("rent")} />
                  </Field>
                  <Field label="Deposit (₹)" id="deposit" required error={errors["deposit"]}>
                    <Input id="deposit" type="number" min={0} value={draft.deposit} onChange={num("deposit")} />
                  </Field>
                  <Field label="Maintenance (₹/mo)" id="maintenance" error={errors["maintenance"]}>
                    <Input id="maintenance" type="number" min={0} value={draft.maintenance} onChange={num("maintenance")} />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 6].map((m) => (
                    <Pill
                      key={m}
                      label={`${m} month deposit`}
                      active={draft.deposit === draft.rent * m}
                      onClick={() => set({ deposit: draft.rent * m })}
                    />
                  ))}
                </div>

                <div
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs",
                    hint.tone === "ok"
                      ? "border-teal/30 bg-teal/10 text-teal"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                  )}
                >
                  {hint.tone === "ok" ? (
                    <CheckCircle2 className="mt-px size-4 shrink-0" />
                  ) : (
                    <TriangleAlert className="mt-px size-4 shrink-0" />
                  )}
                  <span>{hint.text}</span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
                  <div>
                    <Label htmlFor="negotiable">Rent negotiable</Label>
                    <p className="text-[11px] text-muted-foreground">Negotiable homes get more enquiries</p>
                  </div>
                  <Switch id="negotiable" checked={draft.negotiable} onCheckedChange={(v) => set({ negotiable: v })} />
                </div>

                <p className="text-xs text-muted-foreground">
                  Tenant moves in paying {inr(draft.rent + draft.deposit)} upfront · {inr(draft.rent + draft.maintenance)}
                  /month all-in · ₹0 brokerage.
                </p>
              </>
            )}

            {step === 3 && (
              <>
                <label
                  ref={dropRef}
                  htmlFor="photos"
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    addFiles(e.dataTransfer.files);
                  }}
                  className={cn(
                    "grid cursor-pointer place-items-center gap-2 rounded-2xl border border-dashed px-4 py-10 text-center transition-colors",
                    dragOver ? "border-brand bg-brand/10" : "border-border bg-secondary/30 hover:border-brand/60",
                  )}
                >
                  <ImagePlus className="size-6 text-muted-foreground" />
                  <span className="text-sm font-medium">Drag photos here or tap to browse</span>
                  <span className="text-xs text-muted-foreground">Up to 6 images · first photo becomes the cover</span>
                  <input
                    id="photos"
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addFiles(e.target.files ?? []);
                      e.target.value = "";
                    }}
                  />
                </label>

                {photos.length > 0 && (
                  <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map((p, i) => (
                      <li key={p.id} className="group relative overflow-hidden rounded-xl border border-border">
                        <img src={p.url} alt={`Flat photo ${i + 1}`} className="h-28 w-full object-cover" />
                        {i === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-medium text-brand-foreground">
                            Cover
                          </span>
                        )}
                        <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-background/90 to-transparent p-1.5">
                          {i !== 0 && (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              aria-label={`Make photo ${i + 1} the cover`}
                              className="size-7 rounded-full"
                              onClick={() => makeCover(p.id)}
                            >
                              <Star className="size-3.5" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            aria-label={`Remove photo ${i + 1}`}
                            className="size-7 rounded-full"
                            onClick={() => removePhoto(p.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Photos are private until your listing is published, and are always served through expiring links.
                </p>
              </>
            )}

            {step === 4 && (
              <>
                <Field
                  label="Contact number tenants will call"
                  id="phone"
                  required
                  error={errors["contact_phone"]}
                >
                  <Input
                    id="phone"
                    inputMode="tel"
                    maxLength={20}
                    placeholder="98765 43210"
                    value={draft.contact_phone}
                    onChange={(e) => set({ contact_phone: e.target.value })}
                  />
                </Field>
                <p className="text-xs text-muted-foreground">
                  Only signed-in tenants can reveal your number, and it is never shown to anonymous visitors or search
                  engines.
                </p>

                <OwnerVerification
                  phone={draft.contact_phone.trim()}
                  verified={phoneVerified}
                  onVerified={(p) => setVerifiedPhones((prev) => (prev.includes(p) ? prev : [...prev, p]))}
                />

                <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-semibold">{draft.title || "Untitled listing"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {draft.area} · {draft.sqft} sqft · {draft.tenant}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold">{inr(draft.rent)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {draft.negotiable ? "Negotiable" : "Fixed"} · {inr(draft.deposit)} dep
                      </p>
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground sm:grid-cols-4">
                    <Summary label="Config" value={`${draft.bhk} BHK`} />
                    <Summary label="Furnishing" value={draft.furnishing} />
                    <Summary label="Available" value={draft.available_from} />
                    <Summary label="Photos" value={`${photos.length}`} />
                    <Summary label="Metro" value={`${draft.metro_km} km`} />
                    <Summary label="IT hub" value={`${draft.it_corridor_km} km`} />
                    <Summary label="Maintenance" value={inr(draft.maintenance)} />
                    <Summary label="Amenities" value={draft.amenities.length ? draft.amenities.join(", ") : "None"} />
                  </dl>
                </div>

                {busy && uploaded.total > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Uploading photos {uploaded.done}/{uploaded.total}
                    </p>
                    <Progress value={(uploaded.done / uploaded.total) * 100} className="mt-1.5 h-1.5" />
                  </div>
                )}
              </>
            )}

            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
              <Button
                type="button"
                variant="ghost"
                className="rounded-xl"
                disabled={step === 0 || busy}
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={goNext} className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90">
                  Continue <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={publish}
                  disabled={busy}
                  className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Publish listing
                </Button>
              )}
            </div>
          </motion.section>
        </AnimatePresence>
      </div>
    </main>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wide">{label}</dt>
      <dd className="truncate text-foreground">{value}</dd>
    </div>
  );
}

/** Red asterisk used to flag every mandatory field. */
function Req() {
  return (
    <span className="ml-0.5 font-semibold text-destructive" aria-hidden>
      *
    </span>
  );
}

function OptionalTag() {
  return <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">optional</span>;
}

function FieldError({ message }: { message?: string | undefined }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-1 text-[11px] font-medium text-destructive">
      <AlertCircle className="size-3 shrink-0" /> {message}
    </p>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string | undefined;
  children: React.ReactNode;
  required?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <Label htmlFor={htmlFor} className={cn("text-xs text-muted-foreground", className)}>
      <span className="text-foreground">{children}</span>
      {required ? <Req /> : <OptionalTag />}
    </Label>
  );
}

function Field({
  label,
  id,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  id: string;
  error?: string | undefined;
  required?: boolean | undefined;
  hint?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div
      data-invalid={error ? "true" : undefined}
      className={cn(
        "space-y-1.5",
        error &&
          "[&_input]:border-destructive [&_input]:ring-1 [&_input]:ring-destructive/40 [&_textarea]:border-destructive",
      )}
    >
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

function PillGroup({
  label,
  options,
  value,
  onChange,
  required,
  error,
  hint,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Pill key={o} label={o} active={value === o} onClick={() => onChange(o)} />
        ))}
      </div>
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        active
          ? "border-transparent bg-brand text-brand-foreground glow-ring"
          : "border-border bg-secondary/60 text-muted-foreground hover:border-brand/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

