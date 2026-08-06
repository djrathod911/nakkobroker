import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { formatRent } from "@/data/listings";
import { cn } from "@/lib/utils";

export interface Filters {
  city: string;
  houseType: string;
  bhk: number[];
  maxRent: number;
  minRent: number;
  ownerOnly: boolean;
  furnishing: string[];
  amenities: string[];
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
          <span className="text-xs text-foreground">up to {formatRent(filters.maxRent)}</span>
        </div>
        <Slider
          value={[filters.maxRent]}
          min={8000}
          max={130000}
          step={1000}
          onValueChange={([v]) => onChange({ ...filters, maxRent: v ?? filters.maxRent })}
          aria-label="Maximum rent"
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
