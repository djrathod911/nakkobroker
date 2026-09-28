import { Link } from "@tanstack/react-router";

/**
 * Slim site footer — legal links. Used on the home results panel and
 * the sign-in page; content pages can import it as well.
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
      <span aria-hidden className="opacity-50">
        ·
      </span>
      <Link
        to="/copyright"
        className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        Copyright / Takedown
      </Link>
    </footer>
  );
}
