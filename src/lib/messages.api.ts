import { supabase } from "@/integrations/supabase/client";

export interface ConversationRow {
  id: string;
  listing_id: string;
  tenant_id: string;
  owner_id: string;
  preferred_time: string;
  last_message_at: string;
}

export interface ConversationSummary extends ConversationRow {
  listingTitle: string;
  listingArea: string;
  listingCity: string;
  counterpartName: string;
  lastMessage: string;
  unread: number;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read: boolean;
  created_at: string;
}

/** Starts (or reuses) the tenant↔owner thread for a listing and posts the first note. */
export async function requestViewing(input: {
  listingId: string;
  ownerId: string;
  tenantId: string;
  preferredTime: string;
  message: string;
}): Promise<string> {
  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", input.listingId)
    .eq("tenant_id", input.tenantId)
    .maybeSingle();
  if (existing.error) throw existing.error;

  let conversationId = existing.data?.id as string | undefined;

  if (!conversationId) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        listing_id: input.listingId,
        owner_id: input.ownerId,
        tenant_id: input.tenantId,
        preferred_time: input.preferredTime,
      })
      .select("id")
      .single();
    if (error) throw error;
    conversationId = data.id as string;
  }

  await sendMessage(conversationId, input.tenantId, input.message);
  return conversationId;
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: senderId, body });
  if (error) throw error;
}

export async function fetchMyConversationForListing(listingId: string, tenantId: string) {
  const { data, error } = await supabase
    .from("conversations")
    .select("id")
    .eq("listing_id", listingId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}

export async function fetchConversations(userId: string): Promise<ConversationSummary[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,listing_id,tenant_id,owner_id,preferred_time,last_message_at")
    .order("last_message_at", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as ConversationRow[];
  if (!rows.length) return [];

  const listingIds = [...new Set(rows.map((r) => r.listing_id))];
  const peopleIds = [
    ...new Set(rows.map((r) => (r.tenant_id === userId ? r.owner_id : r.tenant_id))),
  ];

  const [listings, profiles, messages] = await Promise.all([
    supabase.from("listings").select("id,title,area,city").in("id", listingIds),
    supabase.rpc("get_profile_display_names", { _ids: peopleIds }),
    supabase
      .from("messages")
      .select("conversation_id,body,read,sender_id,created_at")
      .in(
        "conversation_id",
        rows.map((r) => r.id),
      )
      .order("created_at", { ascending: true }),
  ]);

  const listingMap = new Map((listings.data ?? []).map((l) => [l.id as string, l]));
  const nameMap = new Map(
    (profiles.data ?? []).map((p) => [p.id as string, (p.display_name as string | null) ?? "NakkoBroker user"]),
  );

  return rows.map((r) => {
    const l = listingMap.get(r.listing_id);
    const msgs = (messages.data ?? []).filter((m) => m.conversation_id === r.id);
    const last = msgs[msgs.length - 1];
    return {
      ...r,
      listingTitle: (l?.title as string) ?? "Listing removed",
      listingArea: (l?.area as string) ?? "",
      listingCity: (l?.city as string) ?? "",
      counterpartName: nameMap.get(r.tenant_id === userId ? r.owner_id : r.tenant_id) ?? "NakkoBroker user",
      lastMessage: (last?.body as string) ?? "",
      unread: msgs.filter((m) => !m.read && m.sender_id !== userId).length,
    };
  });
}

export interface ConversationDetail {
  conversation: ConversationRow;
  listingTitle: string;
  listingArea: string;
  listingCity: string;
  counterpartName: string;
}

export async function fetchConversation(id: string, userId: string): Promise<ConversationDetail | null> {
  const { data, error } = await supabase
    .from("conversations")
    .select("id,listing_id,tenant_id,owner_id,preferred_time,last_message_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as ConversationRow;
  const other = row.tenant_id === userId ? row.owner_id : row.tenant_id;
  const [listing, profile] = await Promise.all([
    supabase.from("listings").select("title,area,city").eq("id", row.listing_id).maybeSingle(),
    supabase.from("profiles").select("display_name").eq("id", other).maybeSingle(),
  ]);
  return {
    conversation: row,
    listingTitle: (listing.data?.title as string) ?? "Listing removed",
    listingArea: (listing.data?.area as string) ?? "",
    listingCity: (listing.data?.city as string) ?? "",
    counterpartName: (profile.data?.display_name as string | null) ?? "NakkoBroker user",
  };
}

export async function fetchMessages(conversationId: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,read,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function markConversationRead(conversationId: string, userId: string) {
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("conversation_id", conversationId)
    .eq("read", false)
    .neq("sender_id", userId);
}
