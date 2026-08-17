/**
 * Lightweight, provider-agnostic analytics layer.
 *
 * Events are pushed onto `window.dataLayer` in gtag.js format so any tag
 * manager (or the e2e test suite) can observe them. When a GA4 measurement id
 * is configured, gtag.js is loaded and consumes the same queue.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export type AnalyticsProps = Record<string, unknown>;

export const ANALYTICS_EVENT_ATTR = "data-analytics-event";

function push(args: unknown[]) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

export function trackEvent(name: string, props: AnalyticsProps = {}) {
  push(["event", name, props]);
}

export function trackPageView(path: string, title?: string) {
  trackEvent("page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : path,
    page_title: title ?? (typeof document !== "undefined" ? document.title : ""),
  });
}

/** Reads `data-analytics-*` attributes off the closest tagged ancestor. */
function propsFromElement(el: Element): AnalyticsProps {
  const props: AnalyticsProps = {};
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith("data-analytics-") || attr.name === ANALYTICS_EVENT_ATTR) continue;
    props[attr.name.replace("data-analytics-", "").replace(/-/g, "_")] = attr.value;
  }
  return props;
}

function onDocumentClick(event: Event) {
  const target = event.target as Element | null;
  const el = target?.closest?.(`[${ANALYTICS_EVENT_ATTR}]`);
  if (!el) return;
  const name = el.getAttribute(ANALYTICS_EVENT_ATTR);
  if (!name) return;
  trackEvent(name, propsFromElement(el));
}

let initialized = false;

export function initAnalytics() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;

  window.dataLayer = window.dataLayer || [];

  const measurementId = import.meta.env?.["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as
    | string
    | undefined;

  if (measurementId) {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
    push(["js", new Date()]);
    push(["config", measurementId, { send_page_view: false }]);
  }

  document.addEventListener("click", onDocumentClick, true);
}

/** Test helper: allows re-initialising in a fresh document. */
export function resetAnalyticsForTests() {
  initialized = false;
  if (typeof document !== "undefined") {
    document.removeEventListener("click", onDocumentClick, true);
  }
}
