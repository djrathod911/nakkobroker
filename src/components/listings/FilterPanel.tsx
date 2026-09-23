import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { availabilityStatusLabel, type AvailabilityStatus } from "@/data/listings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatRent } from "@/data/listings";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export interface Filters {
  city: string;
  houseType: string;
  bhk: number[];
  maxRent: number;
  minRent: number;
  ownerOnly: boolean;
  furnishing: string[];
  amenities: string[];
  availabilityStatus: string[]; // "available" | "occupied" | "available_soon"
}

export const RENT_MIN = 5000;
export const RENT_MAX = 130000;

export { CITIES } from "@/lib/cities";
import { CITIES, cityLabel } from "@/lib/cities";
export const HOUSE_TYPES = ["Flat", "Villa"];

export const defaultFilters: Filters = {
  city: "Hyderabad",
  houseType: "Any",
  bhk: [],
  maxRent: RENT_MAX,
  minRent: RENT_MIN,
  ownerOnly: false,
  furnishing: [],
  amenities: [],
  availabilityStatus: [],
};

const FURNISHING = ["Unfurnished", "Semi Furnished", "Fully Furnished"];
const AMENITIES = ["Lift", "Power Backup", "Parking", "Gym", "Swimming Pool"];


function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200",
        selected
          ? "border-transparent bg-brand text-brand-foreground glow-ring"
          : "border-border bg-secondary/60 text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Section wrapper with a live count and a one-tap clear. */
function Section({
  title,
  count = 0,
  onClear,
  hint,
  children,
}: {
  title: string;
  count?: number;
  onClear?: () => void;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
          {count > 0 && (
            <span className="ml-2 rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
              {count}
            </span>
          )}
        </p>
        {count > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Removable summary of every filter that is currently narrowing results. */
export function activeFilterChips(filters: Filters): { id: string; label: string; next: Filters }[] {
  const chips: { id: string; label: string; next: Filters }[] = [];
  if (filters.houseType !== "Any")
    chips.push({ id: "houseType", label: filters.houseType, next: { ...filters, houseType: "Any" } });
  for (const b of filters.bhk)
    chips.push({ id: `bhk-${b}`, label: `${b} BHK`, next: { ...filters, bhk: filters.bhk.filter((v) => v !== b) } });
  if (filters.minRent > RENT_MIN || filters.maxRent < RENT_MAX)
    chips.push({
      id: "budget",
      label: `${formatRent(filters.minRent)} – ${formatRent(filters.maxRent)}`,
      next: { ...filters, minRent: RENT_MIN, maxRent: RENT_MAX },
    });
  for (const f of filters.furnishing)
    chips.push({ id: `fur-${f}`, label: f, next: { ...filters, furnishing: filters.furnishing.filter((v) => v !== f) } });
  for (const a of filters.amenities)
    chips.push({ id: `am-${a}`, label: a, next: { ...filters, amenities: filters.amenities.filter((v) => v !== a) } });
  for (const s of filters.availabilityStatus)
    chips.push({
      id: `av-${s}`,
      label: availabilityStatusLabel(s as AvailabilityStatus),
      next: { ...filters, availabilityStatus: filters.availabilityStatus.filter((v) => v !== s) },
    });
  if (filters.ownerOnly) chips.push({ id: "owner", label: "Direct owners", next: { ...filters, ownerOnly: false } });
  return chips;
}

const BUDGET_PRESETS: { label: string; min: number; max: number }[] = [
  { label: "Under ₹15k", min: RENT_MIN, max: 15000 },
  { label: "₹15k – ₹30k", min: 15000, max: 30000 },
  { label: "₹30k – ₹60k", min: 30000, max: 60000 },
  { label: "₹60k+", min: 60000, max: RENT_MAX },
];

function BudgetInputs({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [minText, setMinText] = useState(String(filters.minRent));
  const [maxText, setMaxText] = useState(String(filters.maxRent));

  // Sync text inputs when the slider or parent resets the range
  useEffect(() => {
    setMinText(String(filters.minRent));
    setMaxText(String(filters.maxRent));
  }, [filters.minRent, filters.maxRent]);

  const commit = (rawMin: string, rawMax: string) => {
    let min = Math.max(RENT_MIN, Math.min(RENT_MAX, Number(rawMin) || RENT_MIN));
    let max = Math.max(RENT_MIN, Math.min(RENT_MAX, Number(rawMax) || RENT_MAX));
    if (min > max) {
      // Keep the changed value and nudge the other to match
      const prevMin = filters.minRent;
      const prevMax = filters.maxRent;
      if (min !== prevMin) max = min;
      else min = max;
    }
    onChange({ ...filters, minRent: min, maxRent: max });
    setMinText(String(min));
    setMaxText(String(max));
  };

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={minText}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            setMinText(v);
          }}
          onBlur={() => commit(minText, maxText)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(minText, maxText);
          }}
          aria-label="Minimum rent"
          className="h-9 rounded-lg border-border bg-secondary/40 pl-7 pr-2 text-right text-sm tabular-nums focus-visible:bg-background"
          placeholder={String(RENT_MIN)}
        />
      </div>
      <span className="text-xs text-muted-foreground">–</span>
      <div className="relative flex-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={maxText}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "");
            setMaxText(v);
          }}
          onBlur={() => commit(minText, maxText)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit(minText, maxText);
          }}
          aria-label="Maximum rent"
          className="h-9 rounded-lg border-border bg-secondary/40 pl-7 pr-2 text-right text-sm tabular-nums focus-visible:bg-background"
          placeholder={String(RENT_MAX)}
        />
      </div>
    </div>
  );
}

export function FilterPanel({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="space-y-6">
      <Section title="City">
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Chip
              key={c}
              label={cityLabel(c)}
              selected={filters.city === c}
              onClick={() => onChange({ ...filters, city: c })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Home type"
        count={filters.houseType !== "Any" ? 1 : 0}
        onClear={() => onChange({ ...filters, houseType: "Any" })}
      >
        <div className="flex flex-wrap gap-2">
          {["Any", ...HOUSE_TYPES].map((t) => (
            <Chip
              key={t}
              label={t}
              selected={filters.houseType === t}
              onClick={() => onChange({ ...filters, houseType: t })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Configuration"
        count={filters.bhk.length}
        onClear={() => onChange({ ...filters, bhk: [] })}
      >
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((n) => (
            <Chip
              key={n}
              label={`${n} BHK`}
              selected={filters.bhk.includes(n)}
              onClick={() =>
                onChange({
                  ...filters,
                  bhk: filters.bhk.includes(n) ? filters.bhk.filter((b) => b !== n) : [...filters.bhk, n],
                })
              }
            />
          ))}
        </div>
      </Section>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget / month</p>
          {(filters.minRent > RENT_MIN || filters.maxRent < RENT_MAX) && (
            <button
              type="button"
              onClick={() => onChange({ ...filters, minRent: RENT_MIN, maxRent: RENT_MAX })}
              className="text-xs font-medium text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {BUDGET_PRESETS.map((p) => (
            <Chip
              key={p.label}
              label={p.label}
              selected={filters.minRent === p.min && filters.maxRent === p.max}
              onClick={() => onChange({ ...filters, minRent: p.min, maxRent: p.max })}
            />
          ))}
        </div>

        <BudgetInputs filters={filters} onChange={onChange} />

        <Slider
          value={[filters.minRent, filters.maxRent]}
          min={RENT_MIN}
          max={RENT_MAX}
          step={1000}
          onValueChange={([lo, hi]) =>
            onChange({
              ...filters,
              minRent: Math.min(lo ?? RENT_MIN, hi ?? RENT_MAX),
              maxRent: Math.max(lo ?? RENT_MIN, hi ?? RENT_MAX),
            })
          }
          aria-label="Monthly rent range"
        />
        <p className="text-[11px] text-muted-foreground">
          Showing homes between {formatRent(filters.minRent)} and {formatRent(filters.maxRent)}
        </p>
      </div>

      <Section
        title="Furnishing"
        count={filters.furnishing.length}
        onClear={() => onChange({ ...filters, furnishing: [] })}
        hint="Pick more than one to widen the search."
      >
        <div className="flex flex-wrap gap-2">
          {FURNISHING.map((f) => (
            <Chip
              key={f}
              label={f}
              selected={filters.furnishing.includes(f)}
              onClick={() => onChange({ ...filters, furnishing: toggle(filters.furnishing, f) })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Must have"
        count={filters.amenities.length}
        onClear={() => onChange({ ...filters, amenities: [] })}
        hint="Homes must have every amenity you pick."
      >
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map((a) => (
            <Chip
              key={a}
              label={a}
              selected={filters.amenities.includes(a)}
              onClick={() => onChange({ ...filters, amenities: toggle(filters.amenities, a) })}
            />
          ))}
        </div>
      </Section>

      <Section
        title="Availability"
        count={filters.availabilityStatus.length}
        onClear={() => onChange({ ...filters, availabilityStatus: [] })}
      >
        <div className="flex flex-wrap gap-2">
          {(["available", "available_soon", "occupied"] as AvailabilityStatus[]).map((value) => (
            <Chip
              key={value}
              label={availabilityStatusLabel(value)}
              selected={filters.availabilityStatus.includes(value)}
              onClick={() =>
                onChange({ ...filters, availabilityStatus: toggle(filters.availabilityStatus, value) })
              }
            />
          ))}
        </div>
      </Section>

      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
        <Label htmlFor="owner-only" className="text-sm font-medium">
          Direct owners only
        </Label>
        <Switch
          id="owner-only"
          checked={filters.ownerOnly}
          onCheckedChange={(v) => onChange({ ...filters, ownerOnly: v })}
        />
      </div>
    </div>
  );
}
