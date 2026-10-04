import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { fetchListings } from "@/lib/listings.api";

const BASE_URL = "https://nakkobroker.com";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/auth", changefreq: "yearly", priority: "0.3" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/copyright", changefreq: "yearly", priority: "0.3" },
          { path: "/rentals/hyderabad", changefreq: "daily", priority: "0.9" },
          { path: "/rentals/bengaluru", changefreq: "daily", priority: "0.9" },
          { path: "/rentals/chennai", changefreq: "daily", priority: "0.9" },
          { path: "/rentals/pune", changefreq: "daily", priority: "0.9" },
          { path: "/rentals/visakhapatnam", changefreq: "daily", priority: "0.9" },
        ];

        try {
          const listings = await fetchListings();
          for (const l of listings) {
            entries.push({ path: `/listing/${l.id}`, changefreq: "weekly", priority: "0.8" });
          }
        } catch {
          /* listings unavailable — still serve the static entries */
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
