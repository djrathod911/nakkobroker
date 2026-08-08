import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_listings",
  title: "Search rental listings",
  description:
    "Search published owner-listed rental homes on NakkoBroker by city, area, home type, BHK and maximum rent.",
  inputSchema: {
    city: z.string().describe("City name, e.g. Hyderabad.").nullable(),
    area: z.string().describe("Locality / area name to match, e.g. Gachibowli.").nullable(),
    house_type: z.enum(["Flat", "Villa"]).describe("Type of home.").nullable(),
    bhk: z.number().int().describe("Exact number of bedrooms.").nullable(),
    max_rent: z.number().int().describe("Maximum monthly rent in rupees.").nullable(),
    owner_only: z.boolean().describe("Only homes posted by owners (exclude spotted To-Let boards).").nullable(),
    limit: z.number().int().describe("Maximum rows to return, default 20, max 50.").nullable(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);

    let query = supabase
      .from("listings")
      .select(
        "id,title,city,area,house_type,bhk,rent,deposit,furnishing,tenant,sqft,available_from,owner_verified,source,votes,created_at",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (input.city) query = query.eq("city", input.city);
    if (input.area) query = query.ilike("area", `%${input.area}%`);
    if (input.house_type) query = query.eq("house_type", input.house_type);
    if (input.bhk !== null && input.bhk !== undefined) query = query.eq("bhk", input.bhk);
    if (input.max_rent !== null && input.max_rent !== undefined) query = query.lte("rent", input.max_rent);
    if (input.owner_only) query = query.eq("source", "Owner");

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { listings: data ?? [] },
    };
  },
});
