import { fileURLToPath } from "node:url";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_ENTRY = path.join(ROOT, "dist/server/index.mjs");

type WorkerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
};

let handler: WorkerEntry;
let html = "";
let status = 0;

async function fetchFromBuild(url: string) {
  return handler.fetch(new Request(url), {}, { waitUntil() {}, passThroughOnException() {} });
}

describe("home route in a production build", () => {
  beforeAll(async () => {

    const mod = (await import(SERVER_ENTRY)) as { default?: WorkerEntry } & WorkerEntry;
    handler = mod.default ?? mod;

    const response = await fetchFromBuild("http://localhost/");
    status = response.status;
    html = await response.text();
  }, 600_000);

  it("responds with 200 HTML", () => {
    expect(status).toBe(200);
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  });

  it("does not render the SSR failure fallback", () => {
    expect(html).not.toContain("This page didn't load");
    expect(html).not.toContain('"unhandled":true');
    expect(html).not.toContain("HTTPError");
  });

  it("is not a blank screen — ships real server-rendered markup", () => {
    expect(html.length).toBeGreaterThan(2000);
    // <body> must contain rendered elements, not just the hydration scripts.
    const body = html.slice(html.indexOf("<body"), html.indexOf("</body>"));
    expect(body).toContain("<main");
    expect(body).toContain("NakkoBroker");
    // Strip script blocks case-insensitively, then strip all tags using a
    // DOMParser-safe approach: collapse every "<...>" sequence including those
    // with ">" inside attribute values by repeatedly removing the innermost
    // angle-bracket pair until none remain.
    let stripped = body;
    // Remove script elements (case-insensitive flag prevents bypass via </Script>).
    // Apply repeatedly until stable to avoid incomplete multi-character sanitization.
    let previous: string;
    do {
      previous = stripped;
      stripped = stripped.replace(/<script\b[^]*?<\/script>/gi, "");
    } while (stripped !== previous);
    // Remove remaining tags: replace the shortest run from "<" to ">" iteratively
    // to handle ">" inside attribute values correctly.
    while (/<[^<>]*>/.test(stripped)) {
      stripped = stripped.replace(/<[^<>]*>/g, " ");
    }
    const textOnly = stripped;
    expect(textOnly.replace(/\s+/g, " ").trim().length).toBeGreaterThan(50);
  });

  it("includes head metadata and the client bundle for hydration", () => {
    expect(html).toContain("NakkoBroker");
    expect(html).toMatch(/<meta name="description" content="[^"]{20,}"/);
    expect(html).toMatch(/<script[^>]+src="\/[^"]+\.js"/);
  });

  it("serves an unknown route without a server error", async () => {
    const response = await fetchFromBuild("http://localhost/this-route-does-not-exist");
    const notFoundHtml = await response.text();
    expect(response.status).toBeLessThan(500);
    expect(notFoundHtml).not.toContain("This page didn't load");
  });
});
