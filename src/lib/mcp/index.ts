import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import myListings from "./tools/my-listings";
import myConversations from "./tools/my-conversations";

// Direct Supabase host: the published SUPABASE_URL is a proxy the OAuth issuer check rejects.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "nakkobroker",
  title: "NakkoBroker",
  version: "0.1.0",
  instructions:
    "Tools for NakkoBroker, a zero-brokerage owner-to-tenant rental platform. Use `search_listings` and `get_listing` to discover published rental homes, `my_listings` for the signed-in user's own posted homes, and `my_conversations` for their owner–tenant viewing chats.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchListings, getListing, myListings, myConversations] as unknown as Parameters<typeof defineMcp>[0]["tools"],
});
