import { describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("@lovable.dev/email-js", () => ({
  createAuthEmailHandler: (options: unknown) => {
    capture(options);
    return () => new Response("ok");
  },
}));
vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
}));

import { Route } from "@/routes/lovable/email/auth/webhook";

describe("email-code authentication", () => {
  it("passes the Cloud-issued signup code to the signup email", async () => {
    const route = Route as unknown as {
      server: { handlers: { POST: (input: { request: Request }) => Response } };
    };
    route.server.handlers.POST({ request: new Request("https://nakkobroker.com/lovable/email/auth/webhook", { method: "POST" }) });
    const options = capture.mock.calls.at(-1)?.[0] as {
      emails: { signup: { render: (data: { token: string; email: string; url: string }) => { props: { token: string } } } };
    };
    const email = options.emails.signup.render({ token: "482915", email: "test@example.test", url: "https://nakkobroker.com" });
    expect(email.props.token).toBe("482915");
  });
});