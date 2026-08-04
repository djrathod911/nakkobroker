import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { createListing } from "@/lib/listings.api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const TITLE = "List your flat free — NakkoBroker Hyderabad";
const DESCRIPTION =
  "Post your Hyderabad flat directly to tenants on NakkoBroker. No brokers, no brokerage, photos and map pin included.";

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

const AREAS: Record<string, [number, number]> = {
  Madhapur: [78.3908, 17.4483],
  Gachibowli: [78.3489, 17.4401],
  Kondapur: [78.3639, 17.4622],
  Ameerpet: [78.4483, 17.4374],
  Kukatpally: [78.4089, 17.4948],
  "Jubilee Hills": [78.4089, 17.4239],
  Nanakramguda: [78.3364, 17.4211],
  Begumpet: [78.4614, 17.4435],
  Manikonda: [78.3838, 17.4021],
  Himayatnagar: [78.4867, 17.4009],
};

const FURNISHING = ["Unfurnished", "Semi Furnished", "Fully Furnished"];
const TENANTS = ["Family", "Bachelor", "Anyone"];
const AMENITIES = ["Lift", "Power Backup", "Parking", "Gym", "Swimming Pool"];

const schema = z.object({
  title: z.string().trim().min(6, "Add a short descriptive title").max(120),
  area: z.string().refine((v) => v in AREAS, "Pick an area"),
  bhk: z.number().int().min(1).max(6),
  rent: z.number().int().min(1000).max(1_000_000),
  deposit: z.number().int().min(0).max(10_000_000),
  maintenance: z.number().int().min(0).max(100_000),
  sqft: z.number().int().min(100).max(20_000),
  metro_km: z.number().min(0).max(60),
  it_corridor_km: z.number().min(0).max(60),
  available_from: z.string().trim().min(1).max(40),
  contact_phone: z.string().trim().max(20).optional(),
});

function ListYourFlat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: "",
    area: "Madhapur",
    bhk: 2,
    rent: 25000,
    deposit: 80000,
    maintenance: 1500,
    sqft: 1000,
    metro_km: 1,
    it_corridor_km: 2,
    available_from: "Immediate",
    contact_phone: "",
    furnishing: "Semi Furnished",
    tenant: "Anyone",
    negotiable: true,
    amenities: [] as string[],
  });
  const [files, setFiles] = useState<File[]>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your details");
      return;
    }
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again");
      const coords = AREAS[form.area]!;
      await createListing(
        {
          title: form.title.trim(),
          area: form.area,
          bhk: form.bhk,
          rent: form.rent,
          deposit: form.deposit,
          maintenance: form.maintenance,
          negotiable: form.negotiable,
          furnishing: form.furnishing,
          tenant: form.tenant,
          metro_km: form.metro_km,
          it_corridor_km: form.it_corridor_km,
          sqft: form.sqft,
          available_from: form.available_from.trim(),
          amenities: form.amenities,
          contact_phone: form.contact_phone.trim() || null,
          lng: coords[0],
          lat: coords[1],
          source: "Owner",
        },
        auth.user.id,
        files,
      );
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Your flat is live — zero brokerage!");
      navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish listing");
    } finally {
      setBusy(false);
    }
  }

  const num = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: Number(e.target.value) });

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to map
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">List your flat</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Free forever. Tenants contact you directly — no brokers in between.
        </p>

        <form onSubmit={onSubmit} className="glass mt-6 space-y-6 rounded-3xl p-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Textarea
              id="title"
              rows={2}
              maxLength={120}
              placeholder="Airy 2BHK with balcony views"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Area</Label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(AREAS).map((a) => (
                <Pill key={a} label={a} active={form.area === a} onClick={() => setForm({ ...form, area: a })} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="BHK" id="bhk">
              <Input id="bhk" type="number" min={1} max={6} value={form.bhk} onChange={num("bhk")} />
            </Field>
            <Field label="Rent (₹/mo)" id="rent">
              <Input id="rent" type="number" min={1000} value={form.rent} onChange={num("rent")} />
            </Field>
            <Field label="Deposit (₹)" id="deposit">
              <Input id="deposit" type="number" min={0} value={form.deposit} onChange={num("deposit")} />
            </Field>
            <Field label="Maintenance (₹)" id="maintenance">
              <Input id="maintenance" type="number" min={0} value={form.maintenance} onChange={num("maintenance")} />
            </Field>
            <Field label="Area (sqft)" id="sqft">
              <Input id="sqft" type="number" min={100} value={form.sqft} onChange={num("sqft")} />
            </Field>
            <Field label="Available from" id="available">
              <Input
                id="available"
                value={form.available_from}
                maxLength={40}
                onChange={(e) => setForm({ ...form, available_from: e.target.value })}
              />
            </Field>
            <Field label="Metro (km)" id="metro">
              <Input id="metro" type="number" step="0.1" min={0} value={form.metro_km} onChange={num("metro_km")} />
            </Field>
            <Field label="IT corridor (km)" id="itc">
              <Input
                id="itc"
                type="number"
                step="0.1"
                min={0}
                value={form.it_corridor_km}
                onChange={num("it_corridor_km")}
              />
            </Field>
            <Field label="Phone (optional)" id="phone">
              <Input
                id="phone"
                maxLength={20}
                value={form.contact_phone}
                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
              />
            </Field>
          </div>

          <div className="space-y-2">
            <Label>Furnishing</Label>
            <div className="flex flex-wrap gap-2">
              {FURNISHING.map((f) => (
                <Pill
                  key={f}
                  label={f}
                  active={form.furnishing === f}
                  onClick={() => setForm({ ...form, furnishing: f })}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Preferred tenant</Label>
            <div className="flex flex-wrap gap-2">
              {TENANTS.map((t) => (
                <Pill key={t} label={t} active={form.tenant === t} onClick={() => setForm({ ...form, tenant: t })} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map((a) => (
                <Pill
                  key={a}
                  label={a}
                  active={form.amenities.includes(a)}
                  onClick={() =>
                    setForm({
                      ...form,
                      amenities: form.amenities.includes(a)
                        ? form.amenities.filter((x) => x !== a)
                        : [...form.amenities, a],
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photos" className="flex items-center gap-2">
              <Upload className="size-4" /> Photos (up to 6)
            </Label>
            <Input
              id="photos"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []).slice(0, 6))}
            />
            {files.length > 0 && (
              <p className="text-xs text-muted-foreground">{files.length} photo(s) selected</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
            <Label htmlFor="negotiable">Rent negotiable</Label>
            <Switch
              id="negotiable"
              checked={form.negotiable}
              onCheckedChange={(v) => setForm({ ...form, negotiable: v })}
            />
          </div>

          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
          >
            {busy && <Loader2 className="size-4 animate-spin" />} Publish listing
          </Button>
        </form>
      </div>
    </main>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
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
          : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
