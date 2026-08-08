import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "my_conversations",
  title: "My chats",
  description:
    "List the signed-in user's owner–tenant viewing conversations on NakkoBroker, optionally with the latest messages of one conversation.",
  inputSchema: {
    conversation_id: z
      .string()
      .describe("Optional conversation id — when set, returns the recent messages of that thread.")
      .nullable(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ conversation_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);

    if (conversation_id) {
      const { data, error } = await supabase
        .from("messages")
        .select("id,conversation_id,sender_id,body,read,created_at")
        .eq("conversation_id", conversation_id)
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      return {
        content: [{ type: "text", text: JSON.stringify(data ?? []) }],
        structuredContent: { messages: data ?? [] },
      };
    }

    const { data, error } = await supabase
      .from("conversations")
      .select("id,listing_id,tenant_id,owner_id,preferred_time,last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(50);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { conversations: data ?? [] },
    };
  },
});
