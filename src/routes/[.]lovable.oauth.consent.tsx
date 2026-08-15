import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { getOAuthNamespace } from "@/lib/oauth-consent";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  head: () => ({
    meta: [
      { title: "Authorize App — NakkoBroker" },
      { name: "description", content: "Review and approve app access to your NakkoBroker account." },
      { property: "og:title", content: "Authorize App — NakkoBroker" },
      {
        property: "og:description",
        content: "Review and approve app access to your NakkoBroker account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  // Browser-only: the Supabase session lives in localStorage, absent during SSR.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id");
    if (!authorizationId) throw new Error("Missing authorization_id");
    const { data, error } = await getOAuthNamespace().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="grid min-h-dvh place-items-center px-4 text-sm text-muted-foreground">
      Could not load this authorization request: {String((error as Error)?.message ?? error)}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error: err } = approve
      ? await getOAuthNamespace().approveAuthorization(authorization_id)
      : await getOAuthNamespace().denyAuthorization(authorization_id);
    if (err) {
      setBusy(false);
      setError(err.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4">
      <div className="glass w-full max-w-md space-y-4 rounded-3xl p-6">
        <span className="grid size-10 place-items-center rounded-2xl bg-brand text-brand-foreground">
          <ShieldCheck className="size-5" aria-hidden />
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Connect {clientName} to NakkoBroker</h1>
        <p className="text-sm text-muted-foreground">
          {clientName} will be able to browse listings and read your own homes and chats as you. You can revoke this at
          any time.
        </p>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            disabled={busy}
            className="flex-1 rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
            onClick={() => decide(true)}
          >
            Approve
          </Button>
          <Button disabled={busy} variant="secondary" className="flex-1 rounded-xl" onClick={() => decide(false)}>
            Deny
          </Button>
        </div>
      </div>
    </main>
  );
}
