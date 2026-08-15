import { createHash, randomInt, timingSafeEqual } from "crypto";

export const OTP_TTL_MINUTES = 10;
export const MAX_ATTEMPTS = 5;

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(last10) ? last10 : null;
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(userId: string, phone: string, code: string): string {
  return createHash("sha256").update(`${userId}:${phone}:${code}`).digest("hex");
}

export function hashesMatch(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Sends the code over SMS when a Twilio connection is configured.
 * Returns false when no SMS provider is available; callers MUST fail the
 * request in that case and never return the code to the client.
 */
export async function sendOtpSms(phone: string, code: string): Promise<boolean> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  const from = process.env["TWILIO_FROM_NUMBER"];
  if (!lovableKey || !twilioKey || !from) return false;

  const res = await fetch("https://connector-gateway.lovable.dev/twilio/Messages.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: `+91${phone}`,
      From: from,
      Body: `${code} is your NakkoBroker owner verification code. It expires in ${OTP_TTL_MINUTES} minutes.`,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Twilio send failed [${res.status}]: ${body}`);
    throw new Error(`Could not send the SMS [${res.status}]`);
  }
  return true;
}
