/**
 * Single source of truth for property availability.
 *
 * Model (mapped onto the existing listings columns — no schema break):
 * - occupancy_status: "vacant" | "occupied"        -> listings.availability_status ("available" | "occupied")
 * - availability_date: ISO date | ""               -> listings.available_from_date
 * - availability_date_confirmed: boolean           -> derived: vacant => true (date required); occupied => date set
 * - listing_status: published / unlisted           -> listings.status (never confused with occupancy)
 */

export type OccupancyStatus = "vacant" | "occupied";

export const OCCUPANCY_OPTIONS: readonly {
  value: OccupancyStatus;
  label: string;
  description: string;
}[] = [
  {
    value: "vacant",
    label: "Vacant — Ready to Move In",
    description: "The property is currently vacant and ready for a tenant.",
  },
  {
    value: "occupied",
    label: "Currently Occupied",
    description: "A tenant is living here, but you can list it for future rental.",
  },
];

/** Today's date as an ISO yyyy-mm-dd string (local time). */
export function todayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True when the ISO date is valid and not in the past. */
export function isValidFutureOrToday(date: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return date >= todayISO(now);
}

export function formatAvailabilityDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export interface AvailabilityInput {
  occupancyStatus: OccupancyStatus;
  availabilityDate: string; // "" when occupied and undecided
  now?: Date;
}

/**
 * Card / detail-page label. Never shows conflicting states and never invents
 * a date the owner did not confirm.
 */
export function availabilityText({ occupancyStatus, availabilityDate, now = new Date() }: AvailabilityInput): string {
  if (occupancyStatus === "vacant") {
    if (!availabilityDate || availabilityDate <= todayISO(now)) return "Available Now";
    return `Available from ${formatAvailabilityDate(availabilityDate)}`;
  }
  if (availabilityDate) return `Currently Occupied — Available from ${formatAvailabilityDate(availabilityDate)}`;
  return "Availability to Be Confirmed";
}

/** Short badge label for map pins and filters. */
export function occupancyBadgeLabel(status: OccupancyStatus): string {
  return status === "vacant" ? "Vacant" : "Occupied — listed for later";
}

/**
 * Validation for the wizard's availability step.
 * Returns an error message or null.
 */
export function validateAvailability(input: AvailabilityInput): string | null {
  const now = input.now ?? new Date();
  if (input.occupancyStatus === "vacant") {
    if (!input.availabilityDate) return "Pick the move-in date (today or later)";
    if (!isValidFutureOrToday(input.availabilityDate, now)) return "Move-in date cannot be in the past";
    return null;
  }
  // Occupied: a date is optional, but when given it must not be in the past.
  if (input.availabilityDate && !isValidFutureOrToday(input.availabilityDate, now)) {
    return "Expected vacancy date cannot be in the past";
  }
  return null;
}

/** Maps the wizard model onto the legacy `available_from` text column (kept NOT NULL). */
export function legacyAvailableFrom(input: AvailabilityInput): string {
  if (input.occupancyStatus === "vacant") {
    const now = input.now ?? new Date();
    return !input.availabilityDate || input.availabilityDate <= todayISO(now) ? "Immediate" : "Available soon";
  }
  return input.availabilityDate ? "Available soon" : "Date not decided";
}
