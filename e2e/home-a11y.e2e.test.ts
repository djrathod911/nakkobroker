import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { JSDOM } from "jsdom";
import { beforeAll, describe, expect, it } from "vitest";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_ENTRY = path.join(ROOT, "dist/server/index.mjs");
const AXE_SOURCE = path.join(ROOT, "node_modules/axe-core/axe.min.js");

type WorkerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response>;
};

type AxeNode = { html: string; target: string[] };
type AxeViolation = { id: string; impact: string | null; help: string; nodes: AxeNode[] };

let dom: JSDOM;
let document: Document;
let violations: AxeViolation[] = [];

function describeViolations(list: AxeViolation[]) {
  return list
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`)
    .join("\n");
}

describe("home route accessibility", () => {
  beforeAll(async () => {
    if (!existsSync(SERVER_ENTRY) || process.env["E2E_FORCE_BUILD"] === "1") {
      execFileSync("npx", ["vite", "build"], { cwd: ROOT, stdio: "inherit" });
    }
    const mod = (await import(SERVER_ENTRY)) as { default?: WorkerEntry } & WorkerEntry;
    const handler = mod.default ?? mod;
    const response = await handler.fetch(new Request("http://localhost/"), {}, {
      waitUntil() {},
      passThroughOnException() {},
    });
    const html = await response.text();

    dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
    document = dom.window.document;

    dom.window.eval(readFileSync(AXE_SOURCE, "utf8"));
    const result = (await (dom.window as unknown as { axe: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: AxeViolation[] }> } }).axe.run(
      document,
      {
        // SSR markup has no computed styles in jsdom, so contrast/visibility-dependent
        // rules cannot be evaluated reliably here.
        rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
        resultTypes: ["violations"],
      },
    )) as { violations: AxeViolation[] };
    violations = result.violations;
  }, 600_000);

  it("has no critical or serious axe violations", () => {
    const blocking = violations.filter((v) => v.impact === "critical" || v.impact === "serious");
    expect(describeViolations(blocking)).toBe("");
  });

  it("has no moderate or minor axe violations", () => {
    const minor = violations.filter((v) => v.impact !== "critical" && v.impact !== "serious");
    expect(describeViolations(minor)).toBe("");
  });

  it("renders exactly one main landmark and one h1", () => {
    expect(document.querySelectorAll("main").length).toBe(1);
    expect(document.querySelectorAll("h1").length).toBe(1);
  });

  it("exposes keyboard-reachable interactive elements with accessible names", () => {
    const interactive = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [role="button"], [tabindex]',
      ),
    ).filter((el) => el.getAttribute("tabindex") !== "-1" && !el.hasAttribute("disabled"));

    expect(interactive.length).toBeGreaterThan(5);

    const unnamed = interactive.filter((el) => {
      const name =
        el.getAttribute("aria-label") ??
        el.getAttribute("title") ??
        el.getAttribute("placeholder") ??
        el.textContent ??
        "";
      return name.trim().length === 0;
    });
    expect(unnamed.map((el) => el.outerHTML.slice(0, 120)).join("\n")).toBe("");
  });

  it("never uses a positive tabindex that hijacks tab order", () => {
    const positive = Array.from(document.querySelectorAll<HTMLElement>("[tabindex]")).filter(
      (el) => Number(el.getAttribute("tabindex")) > 0,
    );
    expect(positive.map((el) => el.outerHTML.slice(0, 120)).join("\n")).toBe("");
  });

  it("keeps the search field and primary actions in the tab order", () => {
    const search = document.querySelector('input[aria-label="Search areas and listings"]');
    expect(search, "search input should be server-rendered").not.toBeNull();
    expect(search?.getAttribute("tabindex")).not.toBe("-1");

    const listCta = Array.from(document.querySelectorAll('a[aria-label="List your flat"]'));
    expect(listCta.length).toBeGreaterThan(0);
    for (const el of listCta) expect(el.getAttribute("href")).toBeTruthy();
  });
});
