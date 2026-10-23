import { describe, expect, it } from "vitest";
import { emptySharedDraft, rentSummary, sharedDraftSchema } from "./accommodation";

describe("shared accommodation rules", () => {
  it("splits a 30000 flat into 15000 contributions", () => {
    expect(rentSummary(30000, 15000, 0, {}).remainingRent).toBe(15000);
  });
  it("allows unequal contributions", () => {
    expect(rentSummary(30000, 12000, 0, {}).remainingRent).toBe(18000);
  });
  it("does not add included utilities again", () => {
    expect(
      rentSummary(30000, 15000, 500, { utilities_included: true, electricity: 1000 }).monthlyTotal,
    ).toBe(15500);
  });
  it("adds separate recurring expenses", () => {
    expect(
      rentSummary(30000, 15000, 500, { electricity: 1000, water: 200, internet: 300, other: 100 })
        .monthlyTotal,
    ).toBe(17100);
  });
  it("requires a tenant permission declaration", () => {
    expect(
      sharedDraftSchema.safeParse({
        ...emptySharedDraft,
        title: "Private room available",
        permission: "confirmed",
        declaration: false,
      }).success,
    ).toBe(false);
  });
  it("does not allow owner claims in Find a Flatmate", () => {
    expect(
      sharedDraftSchema.safeParse({
        ...emptySharedDraft,
        title: "Private room available",
        relationship: "owner",
      }).success,
    ).toBe(false);
  });
  it("rejects negative recurring expenses", () => {
    expect(sharedDraftSchema.safeParse({ ...emptySharedDraft, title: "Private room available", permission: "confirmed", declaration: true, details: { electricity: -100 } }).success).toBe(false);
  });
  it("requires a date for future accommodation", () => {
    expect(sharedDraftSchema.safeParse({ ...emptySharedDraft, title: "Private room available", permission: "confirmed", declaration: true, availability: "available_soon", availableDate: "" }).success).toBe(false);
  });
});
