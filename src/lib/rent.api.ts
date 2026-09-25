import { supabase } from "@/integrations/supabase/client";
import { BUCKET } from "@/lib/move-in.api";

export type RentStatus = "pending" | "on_time" | "late" | "rejected";

export const RENT_STATUS_LABEL: Record<RentStatus, string> = {
  pending: "Waiting for owner",
  on_time: "Paid on time",
  late: "Paid late",
  rejected: "Not confirmed",
};

export const GOOD_RENTER_MONTHS = 12;

export interface RentPayment {
  id: string;
  tenant_id: string;
  owner_id: string | null;
  listing_id: string;
  month: string;
  amount: number;
  paid_on: string;
  receipt_path: string | null;
  note: string;
  status: RentStatus;
  confirmed_at: string | null;
  created_at: string;
  listingTitle?: string;
}

export async function fetchRentPayments(): Promise<RentPayment[]> {
  const { data, error } = await supabase
    .from("rent_payments")
    .select("*")
    .order("month", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as RentPayment[];
  const ids = [...new Set(rows.map((r) => r.listing_id))];
  if (!ids.length) return rows;
  const { data: listings } = await supabase.from("listings").select("id,title,area").in("id", ids);
  const map = new Map((listings ?? []).map((l) => [l.id, [l.title, l.area].filter(Boolean).join(" · ")]));
  return rows.map((r) => ({ ...r, listingTitle: map.get(r.listing_id) ?? "Home" }));
}

export async function logRentPayment(
  input: { listingId: string; month: string; amount: number; paidOn: string; note: string; file?: File | null },
  userId: string,
) {
  let receipt_path: string | null = null;
  if (input.file) {
    const ext = input.file.name.split(".").pop() ?? "jpg";
    receipt_path = `${userId}/rent/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(receipt_path, input.file, { contentType: input.file.type });
    if (upErr) throw upErr;
  }
  const { error } = await supabase.from("rent_payments").insert({
    tenant_id: userId,
    listing_id: input.listingId,
    month: input.month,
    amount: input.amount,
    paid_on: input.paidOn,
    note: input.note,
    receipt_path,
  });
  if (error) {
    if (receipt_path) await supabase.storage.from(BUCKET).remove([receipt_path]);
    if (error.code === "23505") throw new Error("You already logged rent for that month.");
    throw error;
  }
}

export async function confirmRentPayment(id: string, status: Exclude<RentStatus, "pending">) {
  const { error } = await supabase.from("rent_payments").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function deleteRentPayment(p: RentPayment) {
  const { error } = await supabase.from("rent_payments").delete().eq("id", p.id);
  if (error) throw error;
  if (p.receipt_path) await supabase.storage.from(BUCKET).remove([p.receipt_path]);
}

export async function receiptUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export function monthLabel(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

/** Rent is due on the 5th of every month for everyone. */
export const DUE_DAY = 5;

export function dueDateOf(monthIso: string) {
  return `${monthIso.slice(0, 7)}-0${DUE_DAY}`;
}

export function wouldBeOnTime(monthIso: string, paidOn: string) {
  return paidOn <= dueDateOf(monthIso);
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Next due date (today or later) as YYYY-MM-DD, plus whole days until it. */
export function nextDue(today = new Date()) {
  const d = new Date(today.getFullYear(), today.getMonth(), DUE_DAY);
  if (today.getDate() > DUE_DAY) d.setMonth(d.getMonth() + 1);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return { date: ymd(d), days: Math.round((d.getTime() - start.getTime()) / 86_400_000) };
}

/** First-of-month ISO dates for the last `n` months that are already due, newest first. */
export function recentDueMonths(n: number, today = new Date()) {
  const out: string[] = [];
  const d = new Date(today.getFullYear(), today.getMonth(), 1);
  if (today.getDate() < DUE_DAY) d.setMonth(d.getMonth() - 1);
  for (let i = 0; i < n; i++) {
    out.push(ymd(d));
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function dayLabel(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
