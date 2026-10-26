import { describe, expect, it, vi } from "vitest";
import { emptyDraft, stepSchemas } from "./list-flat";
import { SMS_VERIFICATION_ENABLED } from "./phone-verification-policy";

const { privilegedImport } = vi.hoisted(() => ({ privilegedImport: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      middleware: () => builder,
      inputValidator: () => builder,
      handler: (handler: unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => {
  privilegedImport();
  throw new Error("Disabled SMS must not access privileged storage");
});

import { requestPhoneOtp, verifyPhoneOtp } from "./phone-verify.functions";
import { requestLoginOtp, verifyLoginOtp } from "./phone-auth.functions";

describe("no-SMS launch", () => {
  it("disables paid SMS verification", () => {
    expect(SMS_VERIFICATION_ENABLED).toBe(false);
  });

  it.each([
    ["owner code request", requestPhoneOtp],
    ["owner code verification", verifyPhoneOtp],
    ["phone sign-in request", requestLoginOtp],
    ["phone sign-in verification", verifyLoginOtp],
  ])("rejects %s before OTP writes, SMS sends or verification changes", async (_, endpoint) => {
    const handler = endpoint as unknown as (args: unknown) => Promise<unknown>;
    await expect(handler({ data: { phone: "9876543210", code: "123456" }, context: { userId: "test" } })).rejects.toThrow("SMS verification is not enabled");
    expect(privilegedImport).not.toHaveBeenCalled();
  });

  it("accepts a valid listing contact without phone-verification metadata", () => {
    expect(stepSchemas[4]?.safeParse({ ...emptyDraft, contact_phone: "9876543210" }).success).toBe(true);
  });

  it("still rejects an invalid listing contact", () => {
    expect(stepSchemas[4]?.safeParse({ ...emptyDraft, contact_phone: "123" }).success).toBe(false);
  });
});