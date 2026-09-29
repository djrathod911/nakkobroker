import { Link } from "@tanstack/react-router";

const LEGAL_LINKS = [
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
  { to: "/copyright", label: "Copyright / Takedown" },
] as const;

/**
 * Slim site footer — legal links. Used on the home results panel,
 * the sign-in page, and the legal content pages.
 */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer
      className={
        className ??
        "flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2.5 text-[11px] text-muted-foreground"
      }
    >
      <span>© {new Date().getFullYear()} NakkoBroker</span>
      {LEGAL_LINKS.map(({ to, label }) => (
        <span key={to} className="flex items-center gap-3">
          <span aria-hidden className="opacity-50">
            ·
          </span>
          <Link
            to={to}
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            {label}
          </Link>
        </span>
      ))}
    </footer>
  );
}
