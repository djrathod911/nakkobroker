import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

function buildCsp(embedded: boolean): string {
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline'",
    // Dev/preview tooling (Vite HMR, editor bridge) evaluates code at runtime.
    embedded ? "'unsafe-eval'" : "",
    "https://maps.googleapis.com https://maps.gstatic.com https://*.lovable.app https://*.lovableproject.com https://*.gpteng.co",
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.bunny.net",
    "font-src 'self' data: https://fonts.gstatic.com https://fonts.bunny.net",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss: ws:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://*.lovable.app https://*.lovableproject.com",
    "frame-ancestors 'self' https://*.lovable.app https://*.lovableproject.com https://lovable.dev",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}


const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=(self)",
  "display-capture=()",
  "encrypted-media=()",
  "fullscreen=(self)",
  "geolocation=(self)",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "payment=()",
  "usb=()",
].join(", ");

/** Preview/editor hosts embed the app in an iframe, so the legacy header must stay off there. */
function isEmbeddedHost(request: Request): boolean {
  try {
    const host = new URL(request.url).hostname;
    return (
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovableproject.com") ||
      host === "localhost" ||
      host === "127.0.0.1"
    );
  } catch {
    return false;
  }
}

function withSecurityHeaders(response: Response, request: Request): Response {
  const embedded = isEmbeddedHost(request);
  const headers = new Headers(response.headers);
  headers.set("Content-Security-Policy", buildCsp(embedded));
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-XSS-Protection", "0");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", PERMISSIONS_POLICY);
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set("Cross-Origin-Resource-Policy", "same-site");
  headers.set("Cross-Origin-Embedder-Policy", "unsafe-none");
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  if (!embedded) headers.set("X-Frame-Options", "SAMEORIGIN");


  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return withSecurityHeaders(await normalizeCatastrophicSsrResponse(response), request);
    } catch (error) {
      console.error(error);
      return withSecurityHeaders(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
        request,
      );
    }
  },
};

