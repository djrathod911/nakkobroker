import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_ENTRY = path.join(ROOT, "dist/server/index.mjs");

type WorkerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
};

let html = "";

function meta(attr: "name" | "property", key: string): string | null {
  // Attribute order varies, so match the tag then pull content out of it.
  const tagRe = new RegExp(`<meta[^>]*\\b${attr}="${key}"[^>]*>`, "i");
  const tag = html.match(tagRe)?.[0];
  if (!tag) return null;
  return tag.match(/\bcontent="([^"]*)"/i)?.[1] ?? null;
}

describe("home route SEO metadata in a production build", () => {
  beforeAll(async () => {
    const mod = (await import(SERVER_ENTRY)) as { default?: WorkerEntry } & WorkerEntry;
    const handler = mod.default ?? mod;
    const response = await handler.fetch(new Request("http://localhost/"), {}, {
      waitUntil() {},
      passThroughOnException() {},
    });
    expect(response.status).toBe(200);
    html = await response.text();
  }, 600_000);

  it("renders exactly one title with the brand and a keyword", () => {
    const titles = html.match(/<title[^>]*>([\s\S]*?)<\/title>/gi) ?? [];
    expect(titles).toHaveLength(1);
    const title = titles[0]!.replace(/<\/?title[^>]*>/gi, "").trim();
    expect(title).toContain("NakkoBroker");
    expect(title.toLowerCase()).toContain("hyderabad");
    expect(title.length).toBeGreaterThan(10);
    expect(title.length).toBeLessThan(70);
    expect(title).not.toMatch(/Lovable (App|Generated Project)/i);
  });

  it("renders a single meaningful meta description", () => {
    const descriptions = html.match(/<meta[^>]*\bname="description"[^>]*>/gi) ?? [];
    expect(descriptions).toHaveLength(1);
    const description = meta("name", "description");
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(50);
    expect(description!.length).toBeLessThanOrEqual(160);
    expect(description).not.toMatch(/Lovable Generated Project/i);
  });

  it("renders OpenGraph tags consistent with the page", () => {
    const ogTitle = meta("property", "og:title");
    const ogDescription = meta("property", "og:description");
    expect(ogTitle).toContain("NakkoBroker");
    expect(ogDescription).toBe(meta("name", "description"));
    expect(meta("property", "og:type")).toBe("website");
    expect(meta("property", "og:site_name")).toBe("NakkoBroker");
    expect(meta("name", "twitter:card")).toBe("summary_large_image");
  });

  it("self-references canonical and og:url at the home URL", () => {
    const canonicals = html.match(/<link[^>]*rel="canonical"[^>]*>/gi) ?? [];
    expect(canonicals).toHaveLength(1);
    const href = canonicals[0]!.match(/\bhref="([^"]*)"/i)?.[1];
    expect(href).toBe("https://nakkobroker.com/");
    expect(meta("property", "og:url")).toBe("https://nakkobroker.com/");
  });

  it("emits WebSite/Organization JSON-LD", () => {
    const blocks = [
      ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
    ].map((m) => JSON.parse(m[1]!));
    expect(blocks.length).toBeGreaterThan(0);
    const types = JSON.stringify(blocks);
    expect(types).toContain("Organization");
    expect(types).toContain("WebSite");
  });
});
