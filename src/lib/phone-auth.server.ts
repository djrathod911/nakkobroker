import { createHmac } from "crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Accounts are keyed on the phone number; the address is never used for mail. */
export function syntheticEmail(phone: string): string {
  return `p${phone}@phone.nakkobroker.com`;
}

/**
 * Deterministic, server-only password for a phone-keyed account. It never
 * leaves the server: the client receives a Supabase session, not this value.
 */
export function derivedPassword(phone: string): string {
  const pepper = process.env["PHONE_AUTH_PEPPER"];
  if (!pepper) throw new Error("Phone sign-in is not configured");
  return createHmac("sha256", pepper).update(`nakko:${phone}`).digest("hex");
}

/** Publishable-key client used only to mint a session for a verified phone. */
export function createAuthClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}
