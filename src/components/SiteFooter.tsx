import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { CITIES, cityLabel } from "@/lib/cities";

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/copyright", label: "Copyright / Takedown" },
] as const;

/**
 * Slim site footer — legal links styled as small tappable chips so they read
 * as real navigation, not placeholder text. Used on the home results panel,
 * the sign-in page, and the legal content pages.
 */
export function SiteFooter({
  className,
  showCities = false,
}: {
  className?: string;
  /** Render a row of crawlable city links above the legal line (content pages). */
  showCities?: boolean;
}) {
  const legalRow = (
    <div className="flex flex-nowrap items-center justify-center gap-x-1.5">
      <span className="mr-0.5 shrink-0">© {new Date().getFullYear()}</span>
      {LEGAL_LINKS.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className="shrink-0 whitespace-nowrap rounded-full border border-border/70 bg-card/50 px-1.5 py-0.5 font-medium text-foreground/85 transition-colors hover:border-brand/60 hover:bg-card hover:text-foreground"
        >
          {label}
        </Link>
      ))}
    </div>
  );

  if (!showCities) {
    return (
      <footer
        className={cn(
          "flex flex-nowrap items-center justify-center gap-x-1.5 px-3 py-2.5 text-[10px] text-muted-foreground",
          className,
        )}
      >
        {legalRow}
      </footer>
    );
  }

  return (
    <footer
      className={cn(
        "flex flex-col items-center gap-2 px-3 py-2.5 text-[10px] text-muted-foreground",
        className,
      )}
    >
      <nav aria-label="Cities" className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
        {CITIES.map((c) => (
          <Link
            key={c}
            to="/rentals/$city"
            params={{ city: c.toLowerCase() }}
            className="whitespace-nowrap rounded-full px-1.5 py-0.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Rentals in {cityLabel(c)}
          </Link>
        ))}
      </nav>
      {legalRow}
    </footer>
  );
}
