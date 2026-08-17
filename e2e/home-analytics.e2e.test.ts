import { fileURLToPath } from "node:url";
import path from "node:path";
import { JSDOM } from "jsdom";
import { beforeEach, afterEach, describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_ENTRY = path.join(ROOT, "dist/server/index.mjs");

type WorkerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
};

type Analytics = typeof import("../src/lib/analytics");
type Payload = [string, string, Record<string, unknown>];

let dom: JSDOM;
let analytics: Analytics;

function events(): Payload[] {
  const layer = (dom.window as unknown as { dataLayer?: unknown[] }).dataLayer ?? [];
  return layer.filter((entry): entry is Payload => Array.isArray(entry) && entry[0] === "event");
}

function eventNamed(name: string) {
  return events().find((e) => e[1] === name);
}

describe("home route analytics", () => {
  beforeEach(async () => {
    const mod = (await import(SERVER_ENTRY)) as { default?: WorkerEntry } & WorkerEntry;
    const handler = mod.default ?? mod;
    const response = await handler.fetch(new Request("http://localhost/"), {}, {
      waitUntil() {},
      passThroughOnException() {},
    });
    const html = await response.text();

    dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true });

    // Run the real analytics module against the real server-rendered markup.
    const g = globalThis as unknown as Record<string, unknown>;
    g["window"] = dom.window;
    g["document"] = dom.window.document;

    analytics = await import("../src/lib/analytics");
    analytics.resetAnalyticsForTests();
    analytics.initAnalytics();
    analytics.trackPageView("/");
  }, 600_000);

  afterEach(() => {
    analytics?.resetAnalyticsForTests();
    const g = globalThis as unknown as Record<string, unknown>;
    delete g["window"];
    delete g["document"];
    dom.window.close();
  });

  it("fires page_view with the expected payload on the home route", () => {
    const pageView = eventNamed("page_view");
    expect(pageView, "no page_view event was pushed").toBeDefined();
    expect(pageView![2]).toMatchObject({
      page_path: "/",
      page_location: "http://localhost/",
    });
    expect(String(pageView![2]["page_title"])).toContain("NakkoBroker");
  });

  it("fires page_view exactly once per page load", () => {
    expect(events().filter((e) => e[1] === "page_view")).toHaveLength(1);
  });

  it("fires cta_click with the expected payload when the primary CTA is clicked", () => {
    const cta = dom.window.document.querySelector<HTMLElement>(
      '[data-analytics-cta="list_your_flat"]',
    );
    expect(cta, "primary CTA is missing analytics attributes in the production HTML").not.toBeNull();

    cta!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    const click = eventNamed("cta_click");
    expect(click, "no cta_click event was pushed").toBeDefined();
    expect(click![2]).toMatchObject({
      cta: "list_your_flat",
      location: "home_header",
    });
    expect(["signed_in", "signed_out"]).toContain(click![2]["auth_state"]);
  });

  it("attributes clicks on nested CTA content to the tagged element", () => {
    const cta = dom.window.document.querySelector<HTMLElement>(
      '[data-analytics-cta="list_your_flat"]',
    )!;
    const child = cta.querySelector("span") ?? cta;
    child.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(events().filter((e) => e[1] === "cta_click")).toHaveLength(1);
  });

  it("does not emit events for untagged clicks", () => {
    const before = events().length;
    dom.window.document.body.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(events()).toHaveLength(before);
  });
});
