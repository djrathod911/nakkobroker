import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendOtpSms, generateCode, hashCode, hashesMatch, normalizePhone } from "./phone-verify.server";

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const SOURCES = {
  loginFns: "./phone-auth.functions.ts",
  verifyFns: "./phone-verify.functions.ts",
  authRoute: "../routes/auth.tsx",
  ownerVerification: "../components/list-flat/OwnerVerification.tsx",
} as const;

describe("OTP codes are never exposed to the client", () => {
  it("no source file returns or renders a demo/plaintext code", () => {
    for (const [name, rel] of Object.entries(SOURCES)) {
      const src = read(rel);
      expect(src, `${name} must not reference demoCode`).not.toMatch(/demoCode/i);
    }
  });

  it("OTP result types expose no code field", () => {
    for (const rel of [SOURCES.loginFns, SOURCES.verifyFns]) {
      const src = read(rel);
      const iface = src.slice(src.indexOf("export interface"), src.indexOf("export const"));
      expect(iface).not.toMatch(/\bcode\b/);
    }
  });

  it("handlers never place the generated code into the returned object", () => {
    for (const rel of [SOURCES.loginFns, SOURCES.verifyFns]) {
      const src = read(rel);
      // Any `return { ... }` must not carry the `code` variable.
      const returns = src.match(/return\s*\{[^}]*\}/g) ?? [];
      expect(returns.length).toBeGreaterThan(0);
      for (const ret of returns) expect(ret).not.toMatch(/(^|[^A-Za-z])code([^A-Za-z]|$)/);
    }
  });

  it("only ever stores a hash of the code, never the code itself", () => {
    for (const rel of [SOURCES.loginFns, SOURCES.verifyFns]) {
      const src = read(rel);
      expect(src).toMatch(/code_hash:\s*hashCode\(/);
      expect(src).not.toMatch(/\bcode:\s*code\b/);
    }
  });
});

describe("OTP endpoints fail when SMS is not configured", () => {
  const KEYS = ["LOVABLE_API_KEY", "TWILIO_API_KEY", "TWILIO_FROM_NUMBER"] as const;
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    vi.restoreAllMocks();
  });

  it("sendOtpSms reports failure (and sends nothing) with no provider configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendOtpSms("9876543210", "123456")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(KEYS)("sendOtpSms still fails when only %s is set", async (key) => {
    process.env[key] = "value";
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(sendOtpSms("9876543210", "123456")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("both handlers throw instead of returning the code when sendOtpSms is false", () => {
    for (const rel of [SOURCES.loginFns, SOURCES.verifyFns]) {
      const src = read(rel);
      expect(src).toMatch(/const sent = await sendOtpSms\(/);
      expect(src).toMatch(/if \(!sent\)\s*\{[\s\S]*?throw new Error\(/);
    }
  });

  it("sendOtpSms throws when the provider rejects the message", async () => {
    for (const k of KEYS) process.env[k] = "value";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad request", { status: 400 }) as unknown as Response,
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendOtpSms("9876543210", "123456")).rejects.toThrow(/Could not send the SMS/);
  });

  it("sendOtpSms succeeds only when the provider accepts the message", async () => {
    for (const k of KEYS) process.env[k] = "value";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }) as unknown as Response);
    await expect(sendOtpSms("9876543210", "123456")).resolves.toBe(true);
  });
});

describe("OTP primitives", () => {
  it("generates 6-digit codes", () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it("hashes are irreversible and comparison is exact", () => {
    const h = hashCode("login", "9876543210", "123456");
    expect(h).toMatch(/^[a-f0-9]{64}$/);
    expect(h).not.toContain("123456");
    expect(hashesMatch(h, hashCode("login", "9876543210", "123456"))).toBe(true);
    expect(hashesMatch(h, hashCode("login", "9876543210", "123457"))).toBe(false);
  });

  it("normalizes Indian mobile numbers", () => {
    expect(normalizePhone("+91 98765 43210")).toBe("9876543210");
    expect(normalizePhone("12345")).toBeNull();
  });
});
