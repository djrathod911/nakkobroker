import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";

const TITLE = "Sign in with your email — NakkoBroker Hyderabad rentals";
const DESCRIPTION =
  "Sign in or create your account with just your email address. No passwords, no brokers — list your flat or contact owners directly on NakkoBroker.";

/** Only same-origin app paths may be used as a post-login destination. */
function safeNext(value: unknown): string {
  const raw = typeof value === "string" ? value : "";
  return /^\/(?!\/)[\w\-/.$?=&]*$/.test(raw) ? raw : "/";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => ({ next: safeNext(search["next"]) }),
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const [stage, setStage] = useState<"email" | "sent">("email");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const redirectTo = `${window.location.origin}${next === "/" ? "" : next}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: redirectTo,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStage("sent");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the sign-in link");
    } finally {
      setBusy(false);
    }
  }

  // After Supabase redirects back with the token in the URL hash,
  // onAuthStateChange fires automatically and the session is established.
  // We just need to redirect the user to their intended destination.
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN") {
      navigate({ to: next, replace: true });
    }
  });

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to map
        </Link>

        <div className="glass rounded-3xl p-6">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-black text-brand-foreground">
            N
          </span>

          {stage === "email" ? (
            <>
              <h1 className="mt-4 text-xl font-semibold tracking-tight">Sign in to NakkoBroker</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your email and we'll send you a magic sign-in link. No password needed.
              </p>

              <form onSubmit={sendMagicLink} className="mt-5 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  Send sign-in link
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-xl font-semibold tracking-tight">Check your inbox</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a sign-in link to <span className="font-medium text-foreground">{email}</span>. Click it to
                continue — the link expires in 1 hour.
              </p>

              <div className="mt-5 rounded-2xl border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                <p>
                  Didn't get it? Check your spam folder, or{" "}
                  <button
                    type="button"
                    className="font-medium text-brand underline-offset-2 hover:underline"
                    onClick={() => setStage("email")}
                  >
                    try a different email
                  </button>
                  .
                </p>
              </div>
            </>
          )}

          <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
            One account per email. No brokers, no spam — just direct owner-to-tenant connections on NakkoBroker.
          </p>
        </div>
      </div>
    </main>
  );
}
