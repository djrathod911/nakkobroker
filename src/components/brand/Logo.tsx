import { useId } from "react";
import { cn } from "@/lib/utils";

/** "Zero Slash Home": a roofline house cut by a diagonal zero-slash — no brokers. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7 shrink-0", className)} aria-hidden>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--teal)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#g${id})`} />
      <path
        d="M8 15.5 16 8.5l8 7V24a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1z"
        fill="none"
        stroke="var(--brand-foreground)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path d="M10 27 22 6" stroke={`url(#g${id})`} strokeWidth="5" strokeLinecap="round" />
      <path d="M10.5 26 21.5 7" stroke="var(--brand-foreground)" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-sm font-semibold tracking-tight">
        Nakko<span className="text-teal">Broker</span>
      </span>
    </span>
  );
}
