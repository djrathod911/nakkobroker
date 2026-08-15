import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/phone-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Loader2, ShieldCheck, Timer } from "lucide-react";

const TITLE = "Sign in with your mobile — NakkoBroker Hyderabad rentals";
const DESCRIPTION =
  "One-tap mobile OTP sign in. No email, no passwords, no brokers — list your flat or contact owners directly on NakkoBroker.";

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

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const sendOtp = useServerFn(requestLoginOtp);
  const checkOtp = useServerFn(verifyLoginOtp);


  const [stage, setStage] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true);
    try {
      const res = await sendOtp({ data: { phone } });
      setStage("code");
      setCooldown(RESEND_SECONDS);
      toast.success(res.sent ? "Code sent by SMS" : "Verification code generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await checkOtp({ data: { phone, code, name: name.trim() || undefined } });
      const { error } = await supabase.auth.setSession({
        access_token: res.accessToken,
        refresh_token: res.refreshToken,
      });
      if (error) throw error;
      toast.success(res.isNewUser ? "Welcome to NakkoBroker" : "Welcome back");
      navigate({ to: next, replace: true });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify that code");
    } finally {
      setBusy(false);
    }
  }

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
          <h1 className="mt-4 text-xl font-semibold tracking-tight">
            {stage === "phone" ? "Sign in with your mobile" : "Enter the 6-digit code"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stage === "phone"
              ? "Your number is your account. No email, no password, no brokers."
              : `We sent a code to +91 ${phone}.`}
          </p>

          {stage === "phone" ? (
            <form onSubmit={send} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="phone">Mobile number</Label>
                <div className="flex items-center gap-2">
                  <span className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
                    +91
                  </span>
                  <Input
                    id="phone"
                    inputMode="numeric"
                    autoComplete="tel"
                    placeholder="98765 43210"
                    required
                    maxLength={13}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ""))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name (optional)</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Send OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={verify} className="mt-5 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="otp">Verification code</Label>
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.4em]"
                />
              </div>


              <Button
                type="submit"
                disabled={busy || code.length !== 6}
                className="w-full rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Verify and continue
              </Button>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <button type="button" className="hover:text-foreground" onClick={() => setStage("phone")}>
                  Change number
                </button>
                {cooldown > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Timer className="size-3.5" aria-hidden /> Resend in {cooldown}s
                  </span>
                ) : (
                  <button type="button" className="hover:text-foreground" onClick={() => send()}>
                    Resend code
                  </button>
                )}
              </div>
            </form>
          )}

          <p className="mt-5 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden />
            Verified numbers only. One number can list one flat and one villa per city — that is how we keep brokers
            out.
          </p>
        </div>
      </div>
    </main>
  );
}
