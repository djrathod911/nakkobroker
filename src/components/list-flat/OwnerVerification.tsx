import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BadgeCheck, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { requestPhoneOtp, verifyPhoneOtp } from "@/lib/phone-verify.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  phone: string;
  verified: boolean;
  onVerified: (phone: string) => void;
}

export function OwnerVerification({ phone, verified, onVerified }: Props) {
  const sendCode = useServerFn(requestPhoneOtp);
  const checkCode = useServerFn(verifyPhoneOtp);

  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoCode, setDemoCode] = useState<string | null>(null);

  // Changing the number invalidates an in-flight code.
  useEffect(() => {
    setStage("idle");
    setCode("");
    setDemoCode(null);
  }, [phone]);

  if (verified) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-4"
      >
        <BadgeCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-sm font-medium text-success">Owner verified</p>
          <p className="text-xs text-muted-foreground">
            This number is confirmed, so your listing carries the Owner verified badge on the map and detail page.
          </p>
        </div>
      </motion.div>
    );
  }

  async function request() {
    setBusy(true);
    try {
      const res = await sendCode({ data: { phone } });
      setStage("code");
      setDemoCode(res.demoCode ?? null);
      toast.success(res.sent ? "Code sent by SMS" : "Verification code generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setBusy(true);
    try {
      const res = await checkCode({ data: { phone, code } });
      onVerified(res.phone);
      toast.success("Phone verified — your listing gets the Owner verified badge");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not verify that code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Verify your number (optional)</p>
          <p className="text-xs text-muted-foreground">
            Verified owners get a badge, rank higher in trust and typically get more calls. You can publish without it.
          </p>

          {stage === "idle" ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3 rounded-xl"
              disabled={busy || !phone.trim()}
              onClick={request}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />}
              Send verification code
            </Button>
          ) : (
            <div className="mt-3 grid gap-2">
              <Label htmlFor="otp" className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to {phone}
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  id="otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  className="w-32 tracking-[0.3em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                />
                <Button
                  type="button"
                  className="rounded-xl bg-brand text-brand-foreground hover:bg-brand/90"
                  disabled={busy || code.length !== 6}
                  onClick={confirm}
                >
                  {busy && <Loader2 className="size-4 animate-spin" />} Verify
                </Button>
                <Button type="button" variant="ghost" className="rounded-xl text-xs" disabled={busy} onClick={request}>
                  Resend
                </Button>
              </div>
              {demoCode && (
                <p className="text-xs text-warning">
                  SMS delivery isn’t configured yet, so here is your code for testing: <strong>{demoCode}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
