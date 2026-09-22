import { supabase } from "@/integrations/supabase/client";
import { getProfileDisplayNames } from "@/lib/profiles.functions";

export type RepairCategory =
  | "plumbing"
  | "electrical"
  | "appliance"
  | "carpentry"
  | "pest"
  | "cleaning"
  | "structural"
  | "other";

export type RepairPriority = "low" | "normal" | "urgent";
export type RepairStatus = "open" | "in_progress" | "resolved";

export const REPAIR_CATEGORIES: { value: RepairCategory; label: string }[] = [
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliance", label: "Appliance" },
  { value: "carpentry", label: "Carpentry" },
  { value: "pest", label: "Pest control" },
  { value: "cleaning", label: "Cleaning" },
  { value: "structural", label: "Walls & structure" },
  { value: "other", label: "Something else" },
];

export const REPAIR_STATUS_LABEL: Record<RepairStatus, string> = {
  open: "Reported",
  in_progress: "Being fixed",
  resolved: "Fixed",
};

export const REPAIR_PRIORITY_LABEL: Record<RepairPriority, string> = {
  low: "Can wait",
  normal: "Normal",
  urgent: "Urgent",
};

export interface MaintenanceRequest {
  id: string;
  tenant_id: string;
  owner_id: string | null;
  tenancy_id: string | null;
  listing_id: string | null;
  property_label: string;
  title: string;
  category: RepairCategory;
  description: string;
  priority: RepairPriority;
  status: RepairStatus;
  cost: number;
  reported_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceUpdate {
  id: string;
  request_id: string;
  author_id: string;
  kind: "message" | "status";
  body: string;
  created_at: string;
  authorName?: string;
}

export async function fetchMaintenanceRequests(): Promise<MaintenanceRequest[]> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MaintenanceRequest[];
}

export interface NewRepairInput {
  title: string;
  category: RepairCategory;
  description: string;
  priority: RepairPriority;
  tenancy_id?: string | null;
  listing_id?: string | null;
  property_label?: string;
  cost?: number;
}

export async function createMaintenanceRequest(
  input: NewRepairInput,
  userId: string,
): Promise<MaintenanceRequest> {
  const { data, error } = await supabase
    .from("maintenance_requests")
    .insert({
      title: input.title,
      category: input.category,
      description: input.description,
      priority: input.priority,
      tenancy_id: input.tenancy_id ?? null,
      listing_id: input.listing_id ?? null,
      property_label: input.property_label ?? "",
      cost: input.cost ?? 0,
      tenant_id: userId,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MaintenanceRequest;
}

export async function updateMaintenanceStatus(
  id: string,
  status: RepairStatus,
  authorId: string,
) {
  const { error } = await supabase
    .from("maintenance_requests")
    .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
  await supabase.from("maintenance_updates").insert({
    request_id: id,
    author_id: authorId,
    kind: "status",
    body: `Marked as “${REPAIR_STATUS_LABEL[status]}”`,
  });
}

export async function setRepairCost(id: string, cost: number) {
  const { error } = await supabase.from("maintenance_requests").update({ cost }).eq("id", id);
  if (error) throw error;
}

export async function deleteMaintenanceRequest(id: string) {
  const { error } = await supabase.from("maintenance_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMaintenanceUpdates(requestId: string): Promise<MaintenanceUpdate[]> {
  const { data, error } = await supabase
    .from("maintenance_updates")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as MaintenanceUpdate[];
  if (!rows.length) return rows;
  const ids = [...new Set(rows.map((r) => r.author_id))];
  const profiles = await getProfileDisplayNames({ data: { ids } });
  const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? "NakkoBroker user"]));
  return rows.map((r) => ({ ...r, authorName: names.get(r.author_id) ?? "NakkoBroker user" }));
}

export async function postMaintenanceMessage(requestId: string, authorId: string, body: string) {
  const { error } = await supabase
    .from("maintenance_updates")
    .insert({ request_id: requestId, author_id: authorId, kind: "message", body });
  if (error) throw error;
}

export function repairDateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface LinkableHome {
  listing_id: string;
  label: string;
  reason: string;
}

/** Homes on NakkoBroker the tenant already has a connection with (tour booked,
 *  chat started, or saved), so a repair can be linked to the right owner. */
export async function fetchLinkableHomes(userId: string): Promise<LinkableHome[]> {
  const [tours, chats, saved] = await Promise.all([
    supabase.from("tour_bookings").select("listing_id").eq("tenant_id", userId),
    supabase.from("conversations").select("listing_id").eq("tenant_id", userId),
    supabase.from("saved_listings").select("listing_id").eq("user_id", userId),
  ]);

  const reasons = new Map<string, string>();
  for (const row of saved.data ?? []) if (row.listing_id) reasons.set(row.listing_id, "Saved home");
  for (const row of chats.data ?? []) if (row.listing_id) reasons.set(row.listing_id, "You chatted about this home");
  for (const row of tours.data ?? []) if (row.listing_id) reasons.set(row.listing_id, "You booked a visit here");

  const ids = [...reasons.keys()];
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("listings")
    .select("id, title, area, city")
    .in("id", ids);

  return (data ?? []).map((l) => ({
    listing_id: l.id,
    label: [l.title, l.area].filter(Boolean).join(" · "),
    reason: reasons.get(l.id) ?? "",
  }));
}
