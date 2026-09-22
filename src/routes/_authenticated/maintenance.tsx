import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Send, Trash2, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { fetchTenancies } from "@/lib/move-in.api";
import {
  REPAIR_CATEGORIES,
  REPAIR_PRIORITY_LABEL,
  REPAIR_STATUS_LABEL,
  createMaintenanceRequest,
  deleteMaintenanceRequest,
  fetchMaintenanceRequests,
  fetchMaintenanceUpdates,
  postMaintenanceMessage,
  repairDateLabel,
  updateMaintenanceStatus,
  type MaintenanceRequest,
  type RepairCategory,
  type RepairPriority,
  type RepairStatus,
} from "@/lib/maintenance.api";

const TITLE = "Repairs & maintenance — NakkoBroker";
const DESCRIPTION =
  "Log every repair in your home, message the owner about it, and keep a dated record of how well the place was cared for.";

export const Route = createFileRoute("/_authenticated/maintenance")({
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
  component: MaintenancePage,
});

const STATUS_STYLES: Record<RepairStatus, string> = {
  open: "bg-amber-500/15 text-amber-400",
  in_progress: "bg-sky-500/15 text-sky-400",
  resolved: "bg-emerald-500/15 text-emerald-400",
};

function MaintenancePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const requests = useQuery({
    queryKey: ["maintenance-requests", user?.id],
    queryFn: fetchMaintenanceRequests,
    enabled: !!user,
  });

  const list = requests.data ?? [];
  const resolvedCount = list.filter((r) => r.status === "resolved").length;

  const remove = useMutation({
    mutationFn: (id: string) => deleteMaintenanceRequest(id),
    onSuccess: () => {
      toast.success("Repair removed");
      void queryClient.invalidateQueries({ queryKey: ["maintenance-requests", user?.id] });
    },
    onError: () => toast.error("Could not remove that repair"),
  });

  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-20 pt-6">
        <Button asChild variant="ghost" className="rounded-2xl">
          <Link to="/dashboard">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
        </Button>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">Repairs & maintenance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Log anything that needs fixing, talk to the owner about it here, and build a dated record
          of how the home was looked after — handy proof when you move next.
        </p>

        {list.length > 0 && (
          <p className="mt-4 text-xs text-muted-foreground">
            {list.length} repair{list.length === 1 ? "" : "s"} logged · {resolvedCount} fixed
          </p>
        )}

        {!adding ? (
          <Button
            className="mt-4 rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-4" /> Log a repair
          </Button>
        ) : (
          <NewRepairForm
            userId={user?.id ?? ""}
            onDone={() => {
              setAdding(false);
              void queryClient.invalidateQueries({ queryKey: ["maintenance-requests", user?.id] });
            }}
            onCancel={() => setAdding(false)}
          />
        )}

        <div className="mt-6 space-y-3">
          {requests.isLoading ? (
            [0, 1].map((i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)
          ) : list.length === 0 ? (
            <div className="glass rounded-2xl p-6 text-center">
              <Wrench className="mx-auto size-6 text-brand" aria-hidden />
              <p className="mt-2 text-sm font-semibold">No repairs logged yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Log the first one — a leaking tap, a faulty geyser — and it stays on record with the
                date, the owner’s replies, and what it cost.
              </p>
            </div>
          ) : (
            list.map((r) => (
              <RepairCard
                key={r.id}
                request={r}
                userId={user?.id ?? ""}
                open={openId === r.id}
                onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                onDelete={() => remove.mutate(r.id)}
              />
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function NewRepairForm({
  userId,
  onDone,
  onCancel,
}: {
  userId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<RepairCategory>("plumbing");
  const [priority, setPriority] = useState<RepairPriority>("normal");
  const [description, setDescription] = useState("");
  const [homeKey, setHomeKey] = useState<string>("none");

  const folders = useQuery({
    queryKey: ["tenancies", userId],
    queryFn: fetchTenancies,
    enabled: !!userId,
  });

  const homes = useQuery({
    queryKey: ["linkable-homes", userId],
    queryFn: () => fetchLinkableHomes(userId),
    enabled: !!userId,
  });

  const folderList = folders.data ?? [];
  const homeList = homes.data ?? [];

  const save = useMutation({
    mutationFn: () => {
      const tenancyId = homeKey.startsWith("tenancy:") ? homeKey.slice(8) : null;
      const listingId = homeKey.startsWith("listing:") ? homeKey.slice(8) : null;
      const picked = listingId ? homeList.find((h) => h.listing_id === listingId) : undefined;
      return createMaintenanceRequest(
        {
          title: title.trim(),
          category,
          priority,
          description: description.trim(),
          tenancy_id: tenancyId,
          listing_id: listingId,
          property_label: picked?.label ?? "",
        },
        userId,
      );
    },
    onSuccess: () => {
      toast.success("Repair logged");
      onDone();
    },
    onError: () => toast.error("Could not save that repair"),
  });

  return (
    <div className="glass mt-4 space-y-3 rounded-2xl p-4">
      <div>
        <Label htmlFor="repair-title" className="text-xs">
          What needs fixing?
        </Label>
        <Input
          id="repair-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Kitchen tap is leaking"
          className="mt-1 rounded-2xl"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Type of work</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as RepairCategory)}>
            <SelectTrigger className="mt-1 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPAIR_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">How urgent?</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as RepairPriority)}>
            <SelectTrigger className="mt-1 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["low", "normal", "urgent"] as RepairPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {REPAIR_PRIORITY_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {(folderList.length > 0 || homeList.length > 0) && (
        <div>
          <Label className="text-xs">Which home?</Label>
          <Select value={homeKey} onValueChange={setHomeKey}>
            <SelectTrigger className="mt-1 rounded-2xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Not linked to a home</SelectItem>
              {folderList.map((f) => (
                <SelectItem key={f.id} value={`tenancy:${f.id}`}>
                  {f.property_label}
                </SelectItem>
              ))}
              {homeList.map((h) => (
                <SelectItem key={h.listing_id} value={`listing:${h.listing_id}`}>
                  {h.label} — {h.reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Linking a home lets the owner see the repair and reply to you here.
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="repair-note" className="text-xs">
          Details (optional)
        </Label>
        <Textarea
          id="repair-note"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder="Dripping since Monday, water collecting under the sink."
          className="mt-1 rounded-2xl"
        />
      </div>

      <div className="flex gap-2">
        <Button
          className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
          disabled={!title.trim() || save.isPending}
          onClick={() => save.mutate()}
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save repair
        </Button>
        <Button variant="ghost" className="rounded-2xl" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function RepairCard({
  request,
  userId,
  open,
  onToggle,
  onDelete,
}: {
  request: MaintenanceRequest;
  userId: string;
  open: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const isTenant = request.tenant_id === userId;

  const updates = useQuery({
    queryKey: ["maintenance-updates", request.id],
    queryFn: () => fetchMaintenanceUpdates(request.id),
    enabled: open,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["maintenance-updates", request.id] });
    void queryClient.invalidateQueries({ queryKey: ["maintenance-requests", userId] });
  };

  const send = useMutation({
    mutationFn: (body: string) => postMaintenanceMessage(request.id, userId, body),
    onSuccess: () => {
      setDraft("");
      invalidate();
    },
    onError: () => toast.error("Message not sent. Please try again."),
  });

  const setStatus = useMutation({
    mutationFn: (status: RepairStatus) => updateMaintenanceStatus(request.id, status, userId),
    onSuccess: () => {
      toast.success("Repair updated");
      invalidate();
    },
    onError: () => toast.error("Could not update the repair"),
  });

  const category = REPAIR_CATEGORIES.find((c) => c.value === request.category)?.label ?? "Repair";

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="min-w-0 flex-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <p className="truncate text-sm font-semibold">{request.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {category} · {request.property_label} · logged {repairDateLabel(request.reported_at)}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs ${STATUS_STYLES[request.status]}`}
          >
            {REPAIR_STATUS_LABEL[request.status]}
            {request.priority === "urgent" ? " · Urgent" : ""}
          </span>
        </button>
        {isTenant && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-2xl text-muted-foreground"
            aria-label={`Remove ${request.title}`}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>

      {open && (
        <div className="mt-3 border-t border-border pt-3">
          {request.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {request.description}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {(["open", "in_progress", "resolved"] as RepairStatus[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus.mutate(s)}
                aria-pressed={request.status === s}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  request.status === s
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {REPAIR_STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto rounded-2xl bg-secondary/30 p-3">
            {updates.isLoading ? (
              <Skeleton className="h-16 w-full rounded-xl" />
            ) : (updates.data ?? []).length === 0 ? (
              <p className="py-3 text-center text-sm text-muted-foreground">
                {request.owner_id
                  ? "No messages yet — tell the owner what is happening."
                  : "No notes yet. Add one to keep the record complete."}
              </p>
            ) : (
              (updates.data ?? []).map((u) =>
                u.kind === "status" ? (
                  <p key={u.id} className="text-center text-[11px] text-muted-foreground">
                    {u.body} · {repairDateLabel(u.created_at)}
                  </p>
                ) : (
                  <div
                    key={u.id}
                    className={u.author_id === userId ? "flex justify-end" : "flex justify-start"}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        u.author_id === userId
                          ? "bg-brand text-brand-foreground"
                          : "glass text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-line">{u.body}</p>
                      <p
                        className={`mt-1 text-[10px] ${
                          u.author_id === userId ? "opacity-70" : "text-muted-foreground"
                        }`}
                      >
                        {u.authorName} ·{" "}
                        {new Date(u.created_at).toLocaleString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ),
              )
            )}
          </div>

          <div className="mt-3 flex items-end gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && draft.trim()) {
                  e.preventDefault();
                  send.mutate(draft.trim());
                }
              }}
              rows={2}
              maxLength={1000}
              placeholder={request.owner_id ? "Message the owner…" : "Add a note…"}
              className="rounded-2xl"
            />
            <Button
              className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90"
              disabled={!draft.trim() || send.isPending}
              onClick={() => send.mutate(draft.trim())}
              aria-label="Send"
            >
              <Send className="size-4" />
            </Button>
          </div>

          {!request.owner_id && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              This repair is not linked to a home listed here, so only you can see it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
