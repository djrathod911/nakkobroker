import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SERVER_ENTRY = path.join(ROOT, "dist/server/index.mjs");

/** Builds once for the whole e2e run so parallel suites never clobber dist/. */
export default function setup() {
  if (!existsSync(SERVER_ENTRY) || process.env["E2E_FORCE_BUILD"] === "1") {
    execFileSync("npx", ["vite", "build"], { cwd: ROOT, stdio: "inherit" });
  }
  if (!existsSync(SERVER_ENTRY)) {
    throw new Error("production build did not emit a server entry");
  }
}
