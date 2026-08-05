import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Camera, Loader2, ScanText, Sparkles } from "lucide-react";
import { z } from "zod";
import { scanToLetBoard, type BoardScanResult } from "@/lib/tolet-ocr.functions";
import { createListing } from "@/lib/listings.api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TITLE = "Spot a To-Let board — scan it into NakkoBroker";
const DESCRIPTION =
  "Snap a Hyderabad To-Let board and let NakkoBroker read the rent, BHK and phone number for you, then share it with the community in one tap.";

export const Route = createFileRoute("/_authenticated/spot-a-board")({
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
  component: SpotABoard,
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

const schema = z.object({
  title: z.string().trim().min(6, "Add a short descriptive title").max(120),
  area: z.string().refine((v) => v in AREAS, "Pick the area where you saw the board"),
  bhk: z.number().int().min(1).max(6),
  rent: z.number().int().min(1000, "Add the rent shown on the board").max(1_000_000),
  deposit: z.number().int().min(0).max(10_000_000),
  contact_phone: z.string().trim().max(20),
});

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that photo"));
    reader.readAsDataURL(file);
  });
}

function SpotABoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scan = useServerFn(scanToLetBoard);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<BoardScanResult | null>(null);
  const [form, setForm] = useState({
    title: "",
    area: "Madhapur",
    bhk: 2,
    rent: 0,
    deposit: 0,
    furnishing: "Unfurnished",
    tenant: "Anyone",
    available_from: "Immediate",
    contact_phone: "",
  });

  async function onPick(picked: File | undefined) {
    if (!picked) return;
    if (picked.size > 8_000_000) {
      toast.error("That photo is too large — keep it under 8MB");
      return;
    }
    setFile(picked);
    setResult(null);
    const dataUrl = await readAsDataUrl(picked);
    setPreview(dataUrl);
    await runScan(dataUrl, picked.type || "image/jpeg");
  }

  async function runScan(dataUrl: string, mimeType: string) {
    setScanning(true);
    try {
      const res = (await scan({ data: { image: dataUrl, mimeType } })) as BoardScanResult;
      setResult(res);
      setForm((f) => ({
        ...f,
        title: res.title ?? (res.bhk ? `${res.bhk} BHK spotted on a To-Let board` : f.title),
        area: res.area && res.area in AREAS ? res.area : f.area,
        bhk: res.bhk ?? f.bhk,
        rent: res.rent ?? f.rent,
        deposit: res.deposit ?? f.deposit,
        furnishing: res.furnishing ?? f.furnishing,
        tenant: res.tenant ?? f.tenant,
        available_from: res.available_from ?? f.available_from,
        contact_phone: res.contact_phone ?? f.contact_phone,
      }));
      toast.success(
        res.confidence === "low"
          ? "Board read — please double-check the details"
          : "Board read! Review and publish",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read that board");
    } finally {
      setScanning(false);
    }
  }

  async function onPublish(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the details");
      return;
    }
    setPublishing(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Please sign in again");
      const coords = AREAS[form.area]!;
      const id = await createListing(
        {
          title: form.title.trim(),
          area: form.area,
          bhk: form.bhk,
          rent: form.rent,
          deposit: form.deposit,
          maintenance: 0,
          negotiable: true,
          furnishing: form.furnishing,
          tenant: form.tenant,
          metro_km: 0,
          it_corridor_km: 0,
          sqft: 0,
          available_from: form.available_from.trim() || "Immediate",
          amenities: [],
          contact_phone: form.contact_phone.trim() || null,
          lng: coords[0],
          lat: coords[1],
          source: "To-Let Board",
        },
        auth.user.id,
        file ? [file] : [],
      );
      await queryClient.invalidateQueries({ queryKey: ["listings"] });
      toast.success("Thanks! Your spot is live for the community");
      navigate({ to: "/listing/$id", params: { id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not publish this spot");
    } finally {
      setPublishing(false);
    }
  }

  const num = (key: "bhk" | "rent" | "deposit") => (e: React.ChangeEvent<HTMLInputElement>) =>
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
        <h1 className="text-2xl font-semibold tracking-tight">Spot a To-Let board</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snap the board you walked past. We read the rent, BHK and phone number, you confirm — the
          whole city benefits.
        </p>

        <div className="glass mt-6 rounded-3xl p-5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void onPick(e.target.files?.[0])}
          />

          {preview ? (
            <img
              src={preview}
              alt="To-Let board you photographed"
              className="max-h-72 w-full rounded-2xl object-contain"
            />
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="grid w-full place-items-center gap-2 rounded-2xl border border-dashed border-border py-14 text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
            >
              <Camera className="size-7" aria-hidden />
              <span className="text-sm font-medium">Take or upload a photo of the board</span>
              <span className="text-xs">JPG or PNG, up to 8MB</span>
            </button>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
              <Camera className="size-4" /> {preview ? "Choose another" : "Choose photo"}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                disabled={scanning}
                onClick={() => void runScan(preview, file?.type || "image/jpeg")}
              >
                {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanText className="size-4" />}
                Re-scan
              </Button>
            )}
            {scanning && (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-teal" aria-hidden /> Reading the board…
              </span>
            )}
          </div>

          {result?.rawText && (
            <div className="mt-4 rounded-2xl bg-accent/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Text on the board · {result.confidence} confidence
              </p>
              <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{result.rawText}</p>
            </div>
          )}
        </div>

        {result && (
          <form onSubmit={onPublish} className="glass mt-5 space-y-6 rounded-3xl p-5">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Textarea
                id="title"
                rows={2}
                maxLength={120}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Area where you saw it</Label>
              <div className="flex flex-wrap gap-2">
                {Object.keys(AREAS).map((a) => (
                  <Pill
                    key={a}
                    label={a}
                    active={form.area === a}
                    onClick={() => setForm({ ...form, area: a })}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="BHK" id="bhk">
                <Input id="bhk" type="number" min={1} max={6} value={form.bhk} onChange={num("bhk")} />
              </Field>
              <Field label="Rent (₹/mo)" id="rent">
                <Input id="rent" type="number" min={0} value={form.rent} onChange={num("rent")} />
              </Field>
              <Field label="Deposit (₹)" id="deposit">
                <Input id="deposit" type="number" min={0} value={form.deposit} onChange={num("deposit")} />
              </Field>
              <Field label="Phone on board" id="phone">
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
                  <Pill
                    key={t}
                    label={t}
                    active={form.tenant === t}
                    onClick={() => setForm({ ...form, tenant: t })}
                  />
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={publishing}
              className="w-full rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {publishing && <Loader2 className="size-4 animate-spin" />}
              Share this board with the community
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              It will appear on the map as a community-spotted To-Let board.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
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
        "rounded-full border px-3 py-1.5 text-xs transition-colors",
        active
          ? "border-brand bg-brand text-brand-foreground"
          : "border-border text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
