import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  Phone,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  UTILITY_KINDS,
  addUtility,
  createTenancy,
  deleteTenancy,
  deleteTenancyFile,
  deleteUtility,
  fetchFiles,
  fetchTenancies,
  fetchUtilities,
  formatBytes,
  signedFileUrl,
  signedFileUrls,
  uploadTenancyFile,
  type Tenancy,
  type TenancyFile,
  type TenancyFileKind,
} from "@/lib/move-in.api";

const TITLE = "Move-in folder — NakkoBroker";
const DESCRIPTION =
  "Keep your signed lease, utility contacts and move-in photos in one place, so your security deposit is easy to defend.";

export const Route = createFileRoute("/_authenticated/move-in")({
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
  component: MoveInPage,
});

function MoveInPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const folders = useQuery({
    queryKey: ["tenancies", user?.id],
    queryFn: fetchTenancies,
    enabled: !!user,
  });

  const list = folders.data ?? [];
  const active: Tenancy | null = list.find((t) => t.id === activeId) ?? list[0] ?? null;

  const removeFolder = useMutation({
    mutationFn: (id: string) => deleteTenancy(id),
    onSuccess: () => {
      toast.success("Folder deleted");
      setActiveId(null);
      void queryClient.invalidateQueries({ queryKey: ["tenancies", user?.id] });
    },
    onError: () => toast.error("Could not delete that folder"),
  });

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6">
        <Button asChild variant="ghost" className="rounded-2xl">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </Button>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Move-in folder</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your signed lease, utility contacts and move-in photos, kept safely in one place. If the
          deposit is ever disputed, everything you need is here with the date it was added.
        </p>

        {folders.isLoading ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            {list.length > 1 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {list.map((t) => (
                  <Button
                    key={t.id}
                    size="sm"
                    variant={active?.id === t.id ? "default" : "secondary"}
                    className="rounded-full"
                    onClick={() => setActiveId(t.id)}
                  >
                    {t.property_label}
                  </Button>
                ))}
              </div>
            )}

            {creating || !active ? (
              <NewFolderForm
                userId={user?.id}
                onCancel={list.length ? () => setCreating(false) : undefined}
                onCreated={(t) => {
                  setCreating(false);
                  setActiveId(t.id);
                  void queryClient.invalidateQueries({ queryKey: ["tenancies", user?.id] });
                }}
              />
            ) : (
              <>
                <FolderDetail tenancy={active} userId={user!.id} />
                <div className="mt-8 flex flex-wrap items-center justify-between gap-2">
                  <Button variant="secondary" className="rounded-2xl" onClick={() => setCreating(true)}>
                    <FolderPlus className="size-4" /> Add another home
                  </Button>
                  <Button
                    variant="ghost"
                    className="rounded-2xl text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm(`Delete the folder for ${active.property_label}? This removes its files too.`))
                        removeFolder.mutate(active.id);
                    }}
                    disabled={removeFolder.isPending}
                  >
                    <Trash2 className="size-4" /> Delete this folder
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/* --------------------------------- new folder -------------------------------- */

function NewFolderForm({
  userId,
  onCreated,
  onCancel,
}: {
  userId?: string;
  onCreated: (t: Tenancy) => void;
  onCancel?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [rent, setRent] = useState("");
  const [deposit, setDeposit] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createTenancy(
        {
          property_label: label.trim() || "My home",
          address: address.trim(),
          owner_name: ownerName.trim(),
          owner_phone: ownerPhone.trim(),
          rent: Number(rent) || 0,
          deposit: Number(deposit) || 0,
          lease_start: start || null,
          lease_end: end || null,
        },
        userId!,
      ),
    onSuccess: (t) => {
      toast.success("Move-in folder created");
      onCreated(t);
    },
    onError: () => toast.error("Could not create the folder"),
  });

  return (
    <form
      className="glass mt-6 space-y-4 rounded-2xl p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!userId) return;
        create.mutate();
      }}
    >
      <div>
        <h2 className="text-lg font-semibold">Start your folder</h2>
        <p className="text-xs text-muted-foreground">Only you can see anything you add here.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Home name" required>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="2BHK, Madhapur"
            required
            className="rounded-xl"
          />
        </Field>
        <Field label="Address">
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Flat 402, Sai Residency"
            className="rounded-xl"
          />
        </Field>
        <Field label="Owner name">
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="rounded-xl" />
        </Field>
        <Field label="Owner phone">
          <Input
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            inputMode="tel"
            className="rounded-xl"
          />
        </Field>
        <Field label="Monthly rent (₹)">
          <Input value={rent} onChange={(e) => setRent(e.target.value)} inputMode="numeric" className="rounded-xl" />
        </Field>
        <Field label="Deposit paid (₹)">
          <Input
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            inputMode="numeric"
            className="rounded-xl"
          />
        </Field>
        <Field label="Move-in date">
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="rounded-xl" />
        </Field>
        <Field label="Lease ends">
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="rounded-xl" />
        </Field>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="rounded-2xl" disabled={create.isPending || !userId}>
          {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
          Create folder
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" className="rounded-2xl" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

/* ------------------------------- folder detail ------------------------------- */

function FolderDetail({ tenancy, userId }: { tenancy: Tenancy; userId: string }) {
  return (
    <>
      <section className="glass mt-6 rounded-2xl p-4">
        <h2 className="text-lg font-semibold">{tenancy.property_label}</h2>
        {tenancy.address && <p className="text-sm text-muted-foreground">{tenancy.address}</p>}
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Rent" value={tenancy.rent ? `₹${tenancy.rent.toLocaleString("en-IN")}` : "—"} />
          <Stat label="Deposit" value={tenancy.deposit ? `₹${tenancy.deposit.toLocaleString("en-IN")}` : "—"} />
          <Stat label="Moved in" value={tenancy.lease_start ?? "—"} />
          <Stat label="Lease ends" value={tenancy.lease_end ?? "—"} />
        </dl>
        {(tenancy.owner_name || tenancy.owner_phone) && (
          <p className="mt-3 text-sm text-muted-foreground">
            Owner: {tenancy.owner_name || "—"}
            {tenancy.owner_phone && (
              <>
                {" · "}
                <a className="underline" href={`tel:${tenancy.owner_phone}`}>
                  {tenancy.owner_phone}
                </a>
              </>
            )}
          </p>
        )}
      </section>

      <Tabs defaultValue="lease" className="mt-6">
        <TabsList className="grid w-full grid-cols-3 rounded-2xl">
          <TabsTrigger value="lease" className="rounded-xl">
            Documents
          </TabsTrigger>
          <TabsTrigger value="utilities" className="rounded-xl">
            Utilities
          </TabsTrigger>
          <TabsTrigger value="photos" className="rounded-xl">
            Photos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lease" className="mt-4">
          <DocumentsPanel tenancyId={tenancy.id} userId={userId} />
        </TabsContent>
        <TabsContent value="utilities" className="mt-4">
          <UtilitiesPanel tenancyId={tenancy.id} userId={userId} />
        </TabsContent>
        <TabsContent value="photos" className="mt-4">
          <PhotosPanel tenancyId={tenancy.id} userId={userId} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

/* -------------------------------- documents --------------------------------- */

function useFiles(tenancyId: string) {
  return useQuery({
    queryKey: ["tenancy-files", tenancyId],
    queryFn: () => fetchFiles(tenancyId),
  });
}

function DocumentsPanel({ tenancyId, userId }: { tenancyId: string; userId: string }) {
  const queryClient = useQueryClient();
  const files = useFiles(tenancyId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<TenancyFileKind>("lease");

  const upload = useMutation({
    mutationFn: (file: File) => uploadTenancyFile(tenancyId, userId, file, kind),
    onSuccess: () => {
      toast.success("Saved to your folder");
      void queryClient.invalidateQueries({ queryKey: ["tenancy-files", tenancyId] });
    },
    onError: () => toast.error("Upload failed. Files must be under 20 MB."),
  });

  const remove = useMutation({
    mutationFn: (f: TenancyFile) => deleteTenancyFile(f),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-files", tenancyId] }),
  });

  const docs = (files.data ?? []).filter((f) => f.kind === "lease" || f.kind === "receipt" || f.kind === "other");

  return (
    <div className="space-y-3">
      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label className="text-xs">What are you adding?</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as TenancyFileKind)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lease">Signed lease / rental agreement</SelectItem>
              <SelectItem value="receipt">Rent or deposit receipt</SelectItem>
              <SelectItem value="other">Other document</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = "";
          }}
        />
        <Button className="rounded-2xl" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Upload
        </Button>
      </div>

      {files.isLoading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : docs.length ? (
        docs.map((f) => (
          <div key={f.id} className="glass flex items-center gap-3 rounded-2xl p-4">
            <FileText className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{f.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {labelForKind(f.kind)} · {formatBytes(f.size_bytes)} ·{" "}
                {new Date(f.created_at).toLocaleDateString("en-IN")}
              </p>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-full"
              aria-label={`Download ${f.file_name}`}
              onClick={async () => {
                const url = await signedFileUrl(f.path, true);
                if (url) window.open(url, "_blank", "noopener");
                else toast.error("Could not open that file");
              }}
            >
              <Download className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-full text-destructive hover:text-destructive"
              aria-label={`Delete ${f.file_name}`}
              onClick={() => remove.mutate(f)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      ) : (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No documents yet. Add your signed lease so you always have a copy.
        </p>
      )}
    </div>
  );
}

function labelForKind(kind: TenancyFileKind) {
  switch (kind) {
    case "lease":
      return "Signed lease";
    case "receipt":
      return "Receipt";
    case "move_in_photo":
      return "Move-in photo";
    case "move_out_photo":
      return "Move-out photo";
    default:
      return "Document";
  }
}

/* -------------------------------- utilities --------------------------------- */

function UtilitiesPanel({ tenancyId, userId }: { tenancyId: string; userId: string }) {
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<string>(UTILITY_KINDS[0]);
  const [provider, setProvider] = useState("");
  const [account, setAccount] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const utilities = useQuery({
    queryKey: ["tenancy-utilities", tenancyId],
    queryFn: () => fetchUtilities(tenancyId),
  });

  const add = useMutation({
    mutationFn: () =>
      addUtility(tenancyId, userId, {
        kind,
        provider: provider.trim(),
        account_number: account.trim(),
        contact_phone: phone.trim(),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      setProvider("");
      setAccount("");
      setPhone("");
      setNotes("");
      toast.success("Contact saved");
      void queryClient.invalidateQueries({ queryKey: ["tenancy-utilities", tenancyId] });
    },
    onError: () => toast.error("Could not save that contact"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteUtility(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-utilities", tenancyId] }),
  });

  return (
    <div className="space-y-3">
      <form
        className="glass space-y-3 rounded-2xl p-4"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Service</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UTILITY_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field label="Provider / person">
            <Input
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="TSSPDCL, plumber Ravi…"
              className="rounded-xl"
            />
          </Field>
          <Field label="Account / connection number">
            <Input value={account} onChange={(e) => setAccount(e.target.value)} className="rounded-xl" />
          </Field>
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="rounded-xl" />
          </Field>
        </div>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Meter number, billing day, anything worth remembering"
          className="rounded-xl"
          rows={2}
        />
        <Button type="submit" className="rounded-2xl" disabled={add.isPending}>
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add contact
        </Button>
      </form>

      {utilities.isLoading ? (
        <Skeleton className="h-20 w-full rounded-2xl" />
      ) : utilities.data?.length ? (
        utilities.data.map((u) => (
          <div key={u.id} className="glass flex items-start gap-3 rounded-2xl p-4">
            <Phone className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">
                {u.kind}
                {u.provider ? ` · ${u.provider}` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {u.account_number ? `A/c ${u.account_number}` : "No account number"}
                {u.contact_phone && (
                  <>
                    {" · "}
                    <a className="underline" href={`tel:${u.contact_phone}`}>
                      {u.contact_phone}
                    </a>
                  </>
                )}
              </p>
              {u.notes && <p className="mt-1 text-xs text-foreground/80">{u.notes}</p>}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 rounded-full text-destructive hover:text-destructive"
              aria-label={`Delete ${u.kind} contact`}
              onClick={() => remove.mutate(u.id)}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))
      ) : (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No utility contacts yet. Add electricity, water and internet so you never hunt for them.
        </p>
      )}
    </div>
  );
}

/* ---------------------------------- photos ---------------------------------- */

function PhotosPanel({ tenancyId, userId }: { tenancyId: string; userId: string }) {
  const queryClient = useQueryClient();
  const files = useFiles(tenancyId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<TenancyFileKind>("move_in_photo");

  const photos = (files.data ?? []).filter(
    (f) => f.kind === "move_in_photo" || f.kind === "move_out_photo",
  );

  const urls = useQuery({
    queryKey: ["tenancy-photo-urls", tenancyId, photos.map((p) => p.id).join(",")],
    queryFn: () => signedFileUrls(photos.map((p) => p.path)),
    enabled: photos.length > 0,
  });

  const upload = useMutation({
    mutationFn: async (list: File[]) => {
      for (const file of list.slice(0, 10)) {
        await uploadTenancyFile(tenancyId, userId, file, kind);
      }
    },
    onSuccess: () => {
      toast.success("Photos saved with today's date");
      void queryClient.invalidateQueries({ queryKey: ["tenancy-files", tenancyId] });
    },
    onError: () => toast.error("Upload failed. Each photo must be under 20 MB."),
  });

  const remove = useMutation({
    mutationFn: (f: TenancyFile) => deleteTenancyFile(f),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenancy-files", tenancyId] }),
  });

  return (
    <div className="space-y-3">
      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div className="min-w-40 flex-1 space-y-1.5">
          <Label className="text-xs">Photo type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as TenancyFileKind)}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="move_in_photo">Move-in condition</SelectItem>
              <SelectItem value="move_out_photo">Move-out condition</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const list = Array.from(e.target.files ?? []);
            if (list.length) upload.mutate(list);
            e.target.value = "";
          }}
        />
        <Button className="rounded-2xl" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
          {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : <ImageIcon className="size-4" />}
          Add photos
        </Button>
      </div>

      {files.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : photos.length ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            <figure key={p.id} className="glass overflow-hidden rounded-2xl">
              {urls.data?.[p.path] ? (
                <img
                  src={urls.data[p.path]}
                  alt={p.caption || `${labelForKind(p.kind)} — ${p.file_name}`}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              ) : (
                <Skeleton className="aspect-square w-full" />
              )}
              <figcaption className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-[11px] text-muted-foreground">
                  {labelForKind(p.kind)} · {new Date(p.created_at).toLocaleDateString("en-IN")}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 rounded-full text-destructive hover:text-destructive"
                  aria-label={`Delete photo ${p.file_name}`}
                  onClick={() => remove.mutate(p)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <p className="glass rounded-2xl p-6 text-center text-sm text-muted-foreground">
          No photos yet. Snap every room, the walls and any existing damage on the day you move in.
        </p>
      )}
    </div>
  );
}
