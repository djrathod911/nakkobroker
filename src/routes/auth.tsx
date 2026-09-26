import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, ShieldCheck } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const TITLE = "Sign in with an email code — NakkoBroker rentals";
const DESCRIPTION =
  "Sign in or create your account with a one-time code sent to your email. No passwords, no brokers — list your flat or contact owners directly.";

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

const RESEND_SECONDS = 45;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();

  const [stage, setStage] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const cleanEmail = email.trim().toLowerCase();

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    if (!EMAIL_RE.test(cleanEmail)) {
      setError("Enter a valid email address");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const redirectTo = `${window.location.origin}${next === "/" ? "" : next}`;
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (error) throw error;
      setStage("code");
      setCode("");
      setCooldown(RESEND_SECONDS);
      toast.success(`Code sent to ${cleanEmail}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send the code";
      setError(/rate|seconds/i.test(msg) ? "Please wait a moment before requesting another code." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function verify(token: string) {
    if (busy || token.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const { error } = await supabase.auth.verifyOtp({ email: cleanEmail, token, type: "email" });
      if (error) throw error;
      toast.success("You're signed in");
    } catch {
      setError("That code is incorrect or has expired. Try again or resend.");
      setCode("");
    } finally {
      setBusy(false);
    }
  }

  // Covers both the typed code and the email link fallback.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") navigate({ to: next, replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate, next]);

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
              <h1 className="mt-4 text-xl font-semibold tracking-tight">Sign in or create an account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll email you a 6-digit code. No password needed.
              </p>

              <form onSubmit={sendCode} className="mt-5 space-y-3" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    required
                    value={email}
                    aria-invalid={!!error}
                    aria-describedby={error ? "auth-error" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                  />
                </div>
                {error && (
                  <p id="auth-error" role="alert" className="text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={busy || !cleanEmail}
                  className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  Continue with email
                </Button>
              </form>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-xl font-semibold tracking-tight">Enter your code</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                We sent a 6-digit code to <span className="font-medium text-foreground">{cleanEmail}</span>.{" "}
                <button
                  type="button"
                  className="font-medium text-brand underline-offset-2 hover:underline"
                  onClick={() => {
                    setStage("email");
                    setError(null);
                  }}
                >
                  Change
                </button>
              </p>

              <form
                className="mt-5 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  verify(code);
                }}
              >
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={code}
                    autoFocus
                    disabled={busy}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="^[0-9]*$"
                    aria-label="6-digit code"
                    onChange={(v) => {
                      setCode(v);
                      setError(null);
                    }}
                    onComplete={verify}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: 6 }, (_, i) => (
                        <InputOTPSlot key={i} index={i} className="size-11 text-lg" />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <p role="alert" className="text-center text-xs text-destructive">
                    {error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                >
                  {busy && <Loader2 className="size-4 animate-spin" />}
                  Verify and continue
                </Button>
              </form>

              <div className="mt-4 text-center text-xs text-muted-foreground">
                {cooldown > 0 ? (
                  <span>Resend code in {cooldown}s</span>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    className="font-medium text-brand underline-offset-2 hover:underline"
                    onClick={() => sendCode()}
                  >
                    Resend code
                  </button>
                )}
                <p className="mt-2">Can't find it? Check spam or promotions. You can also tap the link in the email.</p>
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
