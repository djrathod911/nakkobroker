import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PhoneInput = z.object({ phone: z.string().trim().min(6).max(20) });
const VerifyInput = z.object({
  phone: z.string().trim().min(6).max(20),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
  name: z.string().trim().max(60).optional(),
});

export interface LoginOtpResult {
  sent: boolean;
  expiresInMinutes: number;
}


export interface LoginSession {
  accessToken: string;
  refreshToken: string;
  phone: string;
  isNewUser: boolean;
}

export const requestLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => PhoneInput.parse(data))
  .handler(async ({ data }): Promise<LoginOtpResult> => {
    const { normalizePhone, generateCode, hashCode, sendOtpSms, OTP_TTL_MINUTES } = await import(
      "./phone-verify.server"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid 10-digit Indian mobile number");

    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("login_otps")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", since);
    if ((count ?? 0) >= 3) throw new Error("Too many codes requested. Try again in a few minutes.");

    const code = generateCode();
    const { error } = await supabaseAdmin.from("login_otps").insert({
      phone,
      code_hash: hashCode("login", phone, code),
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
    if (error) throw new Error(error.message);

    const sent = await sendOtpSms(phone, code);
    if (!sent) {
      console.error("[phone-auth] SMS provider not configured; refusing to disclose OTP");
      throw new Error("SMS sign-in is temporarily unavailable. Please try again later.");
    }
    return { sent: true, expiresInMinutes: OTP_TTL_MINUTES };

  });

export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => VerifyInput.parse(data))
  .handler(async ({ data }): Promise<LoginSession> => {
    const { normalizePhone, hashCode, hashesMatch, MAX_ATTEMPTS } = await import("./phone-verify.server");
    const { syntheticEmail, derivedPassword, createAuthClient } = await import("./phone-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid 10-digit Indian mobile number");

    const { data: row, error } = await supabaseAdmin
      .from("login_otps")
      .select("id, code_hash, attempts, expires_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Request a new code first");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("That code expired — request a new one");
    if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many wrong attempts. Request a new code.");

    if (!hashesMatch(row.code_hash, hashCode("login", phone, data.code))) {
      await supabaseAdmin.from("login_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("That code is not correct");
    }
    await supabaseAdmin.from("login_otps").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const email = syntheticEmail(phone);
    const password = derivedPassword(phone);
    const auth = createAuthClient();

    let isNewUser = false;
    let signIn = await auth.auth.signInWithPassword({ email, password });

    if (signIn.error) {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          phone,
          full_name: data.name?.trim() || `Owner ${phone.slice(-4)}`,
        },
      });
      if (created.error) {
        console.error("[phone-auth] createUser failed", created.error);
        throw new Error("Could not create your account. Please try again.");
      }
      isNewUser = true;
      signIn = await auth.auth.signInWithPassword({ email, password });
    }

    if (signIn.error || !signIn.data.session) {
      console.error("[phone-auth] sign-in failed", signIn.error);
      throw new Error("Could not sign you in. Please try again.");
    }

    const userId = signIn.data.session.user.id;

    // The number is proven at login, so it doubles as owner verification.
    await supabaseAdmin
      .from("verified_phones")
      .upsert({ user_id: userId, phone, verified_at: new Date().toISOString() }, { onConflict: "user_id,phone" });

    await supabaseAdmin
      .from("profiles")
      .update({
        phone,
        ...(data.name?.trim() ? { display_name: data.name.trim() } : {}),
      })
      .eq("id", userId);

    return {
      accessToken: signIn.data.session.access_token,
      refreshToken: signIn.data.session.refresh_token,
      phone,
      isNewUser,
    };
  });
