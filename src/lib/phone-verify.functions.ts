import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PhoneInput = z.object({ phone: z.string().trim().min(6).max(20) });
const VerifyInput = z.object({
  phone: z.string().trim().min(6).max(20),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export interface OtpRequestResult {
  sent: boolean;
  expiresInMinutes: number;
}

export const requestPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PhoneInput.parse(data))
  .handler(async ({ data, context }): Promise<OtpRequestResult> => {
    const {
      normalizePhone,
      generateCode,
      hashCode,
      sendOtpSms,
      OTP_TTL_MINUTES,
    } = await import("./phone-verify.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid 10-digit Indian mobile number");

    // simple throttle: max 3 codes per phone per 15 minutes
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_otps")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("phone", phone)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("Too many codes requested. Try again in a few minutes.");

    const code = generateCode();
    const { error } = await supabaseAdmin.from("phone_otps").insert({
      user_id: context.userId,
      phone,
      code_hash: hashCode(context.userId, phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
    if (error) throw new Error(error.message);

    const sent = await sendOtpSms(phone, code);
    if (!sent) {
      console.error("[phone-verify] SMS provider not configured; refusing to disclose OTP");
      throw new Error("SMS verification is temporarily unavailable. Please try again later.");
    }
    return { sent: true, expiresInMinutes: OTP_TTL_MINUTES };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => VerifyInput.parse(data))
  .handler(async ({ data, context }): Promise<{ verified: true; phone: string }> => {
    const { normalizePhone, hashCode, hashesMatch, MAX_ATTEMPTS } = await import("./phone-verify.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid 10-digit Indian mobile number");

    const { data: row, error } = await supabaseAdmin
      .from("phone_otps")
      .select("id, code_hash, attempts, expires_at, consumed_at")
      .eq("user_id", context.userId)
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Request a new code first");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("That code expired — request a new one");
    if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many wrong attempts. Request a new code.");

    if (!hashesMatch(row.code_hash, hashCode(context.userId, phone, data.code))) {
      await supabaseAdmin
        .from("phone_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("That code is not correct");
    }

    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
    const { error: upsertError } = await supabaseAdmin
      .from("verified_phones")
      .upsert({ user_id: context.userId, phone, verified_at: new Date().toISOString() }, { onConflict: "user_id,phone" });
    if (upsertError) throw new Error(upsertError.message);

    return { verified: true, phone };
  });
