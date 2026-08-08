import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_listing",
  title: "Get listing details",
  description: "Fetch full details of one published NakkoBroker rental listing by its id.",
  inputSchema: { id: z.string().describe("Listing id (uuid).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id,title,description,city,area,house_type,bhk,bathrooms,balconies,floor,total_floors,parking,facing,rent,deposit,maintenance,negotiable,furnishing,tenant,sqft,metro_km,it_corridor_km,available_from,amenities,owner_verified,community_verified,suspicious_price,source,votes,created_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Listing not found or not published." }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { listing: data },
    };
  },
});
