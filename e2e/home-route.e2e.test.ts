import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
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
    if (!existsSync(SERVER_ENTRY) || process.env["E2E_FORCE_BUILD"] === "1") {
      execFileSync("npx", ["vite", "build"], { cwd: ROOT, stdio: "inherit" });
    }
    expect(existsSync(SERVER_ENTRY), "production build did not emit a server entry").toBe(true);

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
    const textOnly = body.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<[^>]+>/g, " ");
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
