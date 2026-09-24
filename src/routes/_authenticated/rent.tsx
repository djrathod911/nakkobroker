import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { fetchLinkableHomes } from "@/lib/maintenance.api";
import {
  GOOD_RENTER_MONTHS,
  RENT_STATUS_LABEL,
  confirmRentPayment,
  deleteRentPayment,
  fetchRentPayments,
  logRentPayment,
  monthLabel,
  receiptUrl,
  type RentPayment,
} from "@/lib/rent.api";
import { RenterBadge, useRenterReputation } from "@/components/reputation/RenterBadge";

const TITLE = "Rent record & Good renter badge — NakkoBroker";
const DESCRIPTION =
  "Log rent payments, get them confirmed by your owner and earn a portable Good renter badge.";

export const Route = createFileRoute("/_authenticated/rent")({
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
  component: RentPage,
});

const STATUS_STYLE: Record<RentPayment["status"], string> = {
  pending: "bg-secondary text-muted-foreground",
  on_time: "bg-brand/15 text-brand",
  late: "bg-destructive/15 text-destructive",
  rejected: "bg-destructive/15 text-destructive",
};

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function RentPage() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();
  const payments = useQuery({ queryKey: ["rent-payments", userId], queryFn: fetchRentPayments, enabled: !!userId });
  const rep = useRenterReputation(userId ? [userId] : []);
  const mine = (payments.data ?? []).filter((p) => p.tenant_id === userId);
  const toConfirm = (payments.data ?? []).filter((p) => p.owner_id === userId);
  const my = rep.data?.get(userId);
  const onTime = my?.on_time_months ?? 0;

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["rent-payments"] });
    void qc.invalidateQueries({ queryKey: ["renter-reputation"] });
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/dashboard" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Rent record</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Log each month's rent with a receipt. Once your owner confirms {GOOD_RENTER_MONTHS} months paid on
        time, you earn the Good renter badge — owners see it when you message them, so you can skip
        extra background checks.
      </p>

      <section className="glass mt-5 rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <BadgeCheck className={`size-8 ${my?.good_renter ? "text-brand" : "text-muted-foreground"}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {my?.good_renter ? "You're a Good renter" : `${onTime} of ${GOOD_RENTER_MONTHS} on-time months`}
            </p>
            <p className="text-xs text-muted-foreground">
              {my?.good_renter
                ? "Your badge shows automatically on your chats and inquiries."
                : "More than one late month in the last year pauses the badge."}
            </p>
          </div>
          <RenterBadge rep={my} compact />
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={Math.min(onTime, GOOD_RENTER_MONTHS)} aria-valuemin={0} aria-valuemax={GOOD_RENTER_MONTHS}>
          <div className="h-full bg-brand transition-all" style={{ width: `${Math.min(100, (onTime / GOOD_RENTER_MONTHS) * 100)}%` }} />
        </div>
      </section>

      {toConfirm.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Payments from your tenants</h2>
          <ul className="mt-3 space-y-3">
            {toConfirm.map((p) => (
              <PaymentRow key={p.id} p={p} asOwner onChange={refresh} />
            ))}
          </ul>
        </section>
      )}

      <LogForm userId={userId} onDone={refresh} />

      <section className="mt-6">
        <h2 className="text-lg font-semibold">Your payments</h2>
        {payments.isLoading ? (
          <Skeleton className="mt-3 h-20 rounded-2xl" />
        ) : mine.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No payments logged yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {mine.map((p) => (
              <PaymentRow key={p.id} p={p} onChange={refresh} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function LogForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const homes = useQuery({ queryKey: ["linkable-homes", userId], queryFn: () => fetchLinkableHomes(userId), enabled: !!userId });
  const [listingId, setListingId] = useState("");
  const [month, setMonth] = useState(thisMonth());
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: () =>
      logRentPayment(
        { listingId, month: `${month}-01`, amount: Number(amount) || 0, paidOn, note: note.trim(), file },
        userId,
      ),
    onSuccess: () => {
      toast.success("Logged — your owner has been asked to confirm it");
      setAmount("");
      setNote("");
      setFile(null);
      onDone();
    },
    onError: (e: Error) => toast.error(e.message || "Could not log payment"),
  });

  const list = homes.data ?? [];
  const valid = listingId && month && Number(amount) > 0 && file && file.size <= 10 * 1024 * 1024;

  return (
    <section className="glass mt-6 rounded-2xl p-4">
      <h2 className="text-lg font-semibold">Log a rent payment</h2>
      {list.length === 0 && !homes.isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Save, chat about, or book a visit to your home on NakkoBroker first, so the right owner can confirm
          your rent.
        </p>
      ) : (
        <form
          className="mt-3 grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) save.mutate();
          }}
        >
          <div>
            <Label htmlFor="rent-home">Home <span className="text-destructive">*</span></Label>
            <select
              id="rent-home"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            >
              <option value="">Choose your home</option>
              {list.map((h) => (
                <option key={h.listing_id} value={h.listing_id}>{h.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rent-month">Rent for month <span className="text-destructive">*</span></Label>
              <Input id="rent-month" type="month" value={month} max={thisMonth()} onChange={(e) => setMonth(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label htmlFor="rent-paid">Paid on <span className="text-destructive">*</span></Label>
              <Input id="rent-paid" type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label htmlFor="rent-amount">Amount (₹) <span className="text-destructive">*</span></Label>
            <Input id="rent-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))} placeholder="25000" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="rent-receipt">Receipt or UPI screenshot <span className="text-destructive">*</span></Label>
            <Input id="rent-receipt" type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="mt-1" />
            {file && file.size > 10 * 1024 * 1024 && <p className="mt-1 text-xs text-destructive">Max 10 MB.</p>}
          </div>
          <div>
            <Label htmlFor="rent-note">Note (optional)</Label>
            <Input id="rent-note" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} className="mt-1" />
          </div>
          <Button type="submit" disabled={!valid || save.isPending} className="rounded-2xl bg-brand text-brand-foreground hover:bg-brand/90">
            {save.isPending && <Loader2 className="size-4 animate-spin" />} Send to owner for confirmation
          </Button>
        </form>
      )}
    </section>
  );
}

function PaymentRow({ p, asOwner, onChange }: { p: RentPayment; asOwner?: boolean; onChange: () => void }) {
  const act = useMutation({
    mutationFn: (s: "on_time" | "late" | "rejected") => confirmRentPayment(p.id, s),
    onSuccess: () => {
      toast.success("Saved");
      onChange();
    },
    onError: () => toast.error("Could not update"),
  });
  const remove = useMutation({
    mutationFn: () => deleteRentPayment(p),
    onSuccess: onChange,
    onError: () => toast.error("Could not delete"),
  });

  return (
    <li className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{monthLabel(p.month)} · ₹{p.amount.toLocaleString("en-IN")}</p>
          <p className="text-xs text-muted-foreground">
            {p.listingTitle} · paid {new Date(p.paid_on + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            {p.note ? ` · ${p.note}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[p.status]}`}>
          {RENT_STATUS_LABEL[p.status]}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {p.receipt_path && (
          <Button
            size="sm"
            variant="secondary"
            className="rounded-xl"
            onClick={async () => {
              try {
                window.open(await receiptUrl(p.receipt_path!), "_blank", "noopener");
              } catch {
                toast.error("Could not open receipt");
              }
            }}
          >
            <FileText className="size-4" /> Receipt
          </Button>
        )}
        {asOwner && (
          <>
            <Button size="sm" className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90" disabled={act.isPending} onClick={() => act.mutate("on_time")}>
              On time
            </Button>
            <Button size="sm" variant="secondary" className="rounded-xl" disabled={act.isPending} onClick={() => act.mutate("late")}>
              Late
            </Button>
            <Button size="sm" variant="ghost" className="rounded-xl" disabled={act.isPending} onClick={() => act.mutate("rejected")}>
              Not received
            </Button>
          </>
        )}
        {!asOwner && p.status === "pending" && (
          <Button size="sm" variant="ghost" className="rounded-xl" onClick={() => remove.mutate()} aria-label="Delete payment">
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
