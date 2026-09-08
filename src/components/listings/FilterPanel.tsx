import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatRent } from "@/data/listings";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

export const CITIES = ["Hyderabad", "Bengaluru", "Chennai", "Pune"];
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

function BudgetInputs({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const [minText, setMinText] = useState(String(filters.minRent));
  const [maxText, setMaxText] = useState(String(filters.maxRent));

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
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">City</p>
        <div className="flex flex-wrap gap-2">
          {CITIES.map((c) => (
            <Chip
              key={c}
              label={c}
              selected={filters.city === c}
              onClick={() => onChange({ ...filters, city: c })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Home type</p>
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
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuration</p>
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
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget</p>
          <span className="text-xs text-foreground">
            {formatRent(filters.minRent)} – {formatRent(filters.maxRent)}
          </span>
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
      </div>


      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Furnishing</p>
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
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amenities</p>
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
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Availability</p>
        <div className="flex flex-wrap gap-2">
          {[
            { value: "available", label: "Available Now" },
            { value: "available_soon", label: "Available Soon" },
            { value: "occupied", label: "Occupied" },
          ].map((opt) => (
            <Chip
              key={opt.value}
              label={opt.label}
              selected={filters.availabilityStatus.includes(opt.value)}
              onClick={() =>
                onChange({ ...filters, availabilityStatus: toggle(filters.availabilityStatus, opt.value) })
              }
            />
          ))}
        </div>
      </div>

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
