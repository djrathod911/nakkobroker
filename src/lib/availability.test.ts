import { describe, expect, it } from "vitest";
import {
  availabilityText,
  isValidFutureOrToday,
  legacyAvailableFrom,
  occupancyBadgeLabel,
  todayISO,
  validateAvailability,
} from "@/lib/availability";

const NOW = new Date(2026, 9, 27); // 27 Oct 2026, local time
const TODAY = "2026-10-27";

describe("availabilityText", () => {
  it("shows Available Now for a vacant property with today's date", () => {
    expect(availabilityText({ occupancyStatus: "vacant", availabilityDate: TODAY, now: NOW })).toBe("Available Now");
  });

  it("shows Available Now for a vacant property with no date", () => {
    expect(availabilityText({ occupancyStatus: "vacant", availabilityDate: "", now: NOW })).toBe("Available Now");
  });

  it("shows the future move-in date for a vacant property", () => {
    expect(availabilityText({ occupancyStatus: "vacant", availabilityDate: "2026-11-15", now: NOW })).toBe(
      "Available from 15 November 2026",
    );
  });

  it("shows occupied with the confirmed vacancy date", () => {
    expect(availabilityText({ occupancyStatus: "occupied", availabilityDate: "2026-12-01", now: NOW })).toBe(
      "Currently Occupied — Available from 1 December 2026",
    );
  });

  it("never invents a date for an occupied property with an undecided date", () => {
    expect(availabilityText({ occupancyStatus: "occupied", availabilityDate: "", now: NOW })).toBe(
      "Availability to Be Confirmed",
    );
  });
});

describe("validateAvailability", () => {
  it("requires a date for vacant properties", () => {
    expect(validateAvailability({ occupancyStatus: "vacant", availabilityDate: "", now: NOW })).toMatch(/move-in date/i);
  });

  it("rejects past move-in dates", () => {
    expect(validateAvailability({ occupancyStatus: "vacant", availabilityDate: "2026-10-01", now: NOW })).toMatch(/past/i);
  });

  it("accepts today for vacant properties", () => {
    expect(validateAvailability({ occupancyStatus: "vacant", availabilityDate: TODAY, now: NOW })).toBeNull();
  });

  it("allows occupied properties with no decided date", () => {
    expect(validateAvailability({ occupancyStatus: "occupied", availabilityDate: "", now: NOW })).toBeNull();
  });

  it("allows occupied properties with a future date", () => {
    expect(validateAvailability({ occupancyStatus: "occupied", availabilityDate: "2027-01-01", now: NOW })).toBeNull();
  });

  it("rejects a past expected-vacancy date", () => {
    expect(validateAvailability({ occupancyStatus: "occupied", availabilityDate: "2020-01-01", now: NOW })).toMatch(/past/i);
  });
});

describe("isValidFutureOrToday", () => {
  it("accepts today and future dates, rejects past and malformed", () => {
    expect(isValidFutureOrToday(TODAY, NOW)).toBe(true);
    expect(isValidFutureOrToday("2026-12-31", NOW)).toBe(true);
    expect(isValidFutureOrToday("2026-10-26", NOW)).toBe(false);
    expect(isValidFutureOrToday("not-a-date", NOW)).toBe(false);
    expect(isValidFutureOrToday("", NOW)).toBe(false);
  });
});

describe("legacyAvailableFrom", () => {
  it("maps the model onto the legacy text column", () => {
    expect(legacyAvailableFrom({ occupancyStatus: "vacant", availabilityDate: TODAY, now: NOW })).toBe("Immediate");
    expect(legacyAvailableFrom({ occupancyStatus: "vacant", availabilityDate: "2026-11-15", now: NOW })).toBe("Available soon");
    expect(legacyAvailableFrom({ occupancyStatus: "occupied", availabilityDate: "2026-12-01", now: NOW })).toBe("Available soon");
    expect(legacyAvailableFrom({ occupancyStatus: "occupied", availabilityDate: "", now: NOW })).toBe("Date not decided");
  });
});

describe("occupancyBadgeLabel", () => {
  it("labels the two occupancy states", () => {
    expect(occupancyBadgeLabel("vacant")).toBe("Vacant");
    expect(occupancyBadgeLabel("occupied")).toBe("Occupied — listed for later");
  });
});

describe("todayISO", () => {
  it("formats the local date as yyyy-mm-dd", () => {
    expect(todayISO(NOW)).toBe(TODAY);
  });
});
