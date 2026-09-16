import { supabase } from "@/integrations/supabase/client";

export const BUCKET = "move-in-folder";

export type TenancyFileKind = "lease" | "move_in_photo" | "move_out_photo" | "receipt" | "other";

export interface Tenancy {
  id: string;
  tenant_id: string;
  listing_id: string | null;
  property_label: string;
  address: string;
  owner_name: string;
  owner_phone: string;
  rent: number;
  deposit: number;
  lease_start: string | null;
  lease_end: string | null;
  notes: string;
  created_at: string;
}

export interface TenancyUtility {
  id: string;
  tenancy_id: string;
  kind: string;
  provider: string;
  account_number: string;
  contact_phone: string;
  notes: string;
  created_at: string;
}

export interface TenancyFile {
  id: string;
  tenancy_id: string;
  kind: TenancyFileKind;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  caption: string;
  created_at: string;
}

export const UTILITY_KINDS = [
  "Electricity",
  "Water",
  "Gas",
  "Internet",
  "Society / Maintenance",
  "Housekeeping",
  "Other",
] as const;

/* ---------------------------------- folders --------------------------------- */

export async function fetchTenancies(): Promise<Tenancy[]> {
  const { data, error } = await supabase
    .from("tenancies")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Tenancy[];
}

export interface TenancyInput {
  property_label: string;
  address?: string;
  owner_name?: string;
  owner_phone?: string;
  rent?: number;
  deposit?: number;
  lease_start?: string | null;
  lease_end?: string | null;
  notes?: string;
  listing_id?: string | null;
}

export async function createTenancy(input: TenancyInput, userId: string): Promise<Tenancy> {
  const { data, error } = await supabase
    .from("tenancies")
    .insert({ ...input, tenant_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return data as Tenancy;
}

export async function updateTenancy(id: string, patch: Partial<TenancyInput>) {
  const { error } = await supabase.from("tenancies").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteTenancy(id: string) {
  const { data: files } = await supabase.from("tenancy_files").select("path").eq("tenancy_id", id);
  const paths = (files ?? []).map((f) => f.path as string);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase.from("tenancies").delete().eq("id", id);
  if (error) throw error;
}

/* --------------------------------- utilities -------------------------------- */

export async function fetchUtilities(tenancyId: string): Promise<TenancyUtility[]> {
  const { data, error } = await supabase
    .from("tenancy_utilities")
    .select("*")
    .eq("tenancy_id", tenancyId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TenancyUtility[];
}

export async function addUtility(
  tenancyId: string,
  userId: string,
  input: { kind: string; provider: string; account_number: string; contact_phone: string; notes: string },
) {
  const { error } = await supabase
    .from("tenancy_utilities")
    .insert({ ...input, tenancy_id: tenancyId, tenant_id: userId });
  if (error) throw error;
}

export async function deleteUtility(id: string) {
  const { error } = await supabase.from("tenancy_utilities").delete().eq("id", id);
  if (error) throw error;
}

/* ----------------------------------- files ---------------------------------- */

export async function fetchFiles(tenancyId: string): Promise<TenancyFile[]> {
  const { data, error } = await supabase
    .from("tenancy_files")
    .select("*")
    .eq("tenancy_id", tenancyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TenancyFile[];
}

export async function uploadTenancyFile(
  tenancyId: string,
  userId: string,
  file: File,
  kind: TenancyFileKind,
  caption = "",
) {
  const safe = file.name.replace(/[^\w.-]/g, "_");
  const path = `${userId}/${tenancyId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
  if (up.error) throw up.error;
  const { error } = await supabase.from("tenancy_files").insert({
    tenancy_id: tenancyId,
    tenant_id: userId,
    kind,
    path,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    caption,
  });
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
}

export async function deleteTenancyFile(file: TenancyFile) {
  await supabase.storage.from(BUCKET).remove([file.path]);
  const { error } = await supabase.from("tenancy_files").delete().eq("id", file.id);
  if (error) throw error;
}

export async function signedFileUrl(path: string, download = false) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, { download });
  return data?.signedUrl ?? null;
}

export async function signedFileUrls(paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
  const out: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
