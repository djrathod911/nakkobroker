/** Launch without paid SMS; email authentication does not prove phone ownership. */
export const SMS_VERIFICATION_ENABLED = false;

export function requireSmsVerification() {
  if (!SMS_VERIFICATION_ENABLED) {
    throw new Error("SMS verification is not enabled. Continue with email; you can publish without phone verification.");
  }
}