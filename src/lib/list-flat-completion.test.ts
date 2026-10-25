import { describe, expect, it } from "vitest";
import { emptyDraft, sectionStatuses, restoreFlatDraft } from "./list-flat";

describe("listing section completion", () => {
  it("does not complete pricing from preset values", () => {
    expect(sectionStatuses(emptyDraft, 0)[2]?.complete).toBe(false);
  });
  it("does not complete pricing from only one entered amount", () => {
    expect(sectionStatuses({ ...emptyDraft, rent: 50000, enteredFields: ["rent"] }, 0)[2]?.complete).toBe(false);
  });
  it("completes pricing when all amounts are entered, including zero expenses", () => {
    expect(sectionStatuses({ ...emptyDraft, deposit: 0, maintenance: 0, enteredFields: ["rent", "deposit", "maintenance"] }, 0)[2]?.complete).toBe(true);
  });
  it("completes valid pricing when explicitly confirmed", () => {
    expect(sectionStatuses({ ...emptyDraft, confirmedSections: [2] }, 0)[2]?.complete).toBe(true);
  });
  it("removes completion after a confirmed section becomes invalid", () => {
    expect(sectionStatuses({ ...emptyDraft, rent: 0, confirmedSections: [2] }, 0)[2]?.complete).toBe(false);
  });
  it("keeps untouched future pricing incomplete in a legacy property-step draft", () => {
    const statuses = sectionStatuses(restoreFlatDraft(emptyDraft, 1), 0);
    expect(statuses[0]?.complete).toBe(true);
    expect(statuses[2]?.complete).toBe(false);
  });
  it("restores explicitly confirmed sections regardless of current step", () => {
    expect(sectionStatuses(restoreFlatDraft({ ...emptyDraft, confirmedSections: [2] }, 0), 0)[2]?.complete).toBe(true);
  });
  it("requires actual photos rather than visiting or skipping the photo step", () => {
    expect(sectionStatuses({ ...emptyDraft, confirmedSections: [3] }, 0)[3]?.complete).toBe(false);
    expect(sectionStatuses(emptyDraft, 1)[3]?.complete).toBe(true);
  });
  it("does not let completing pricing complete property or review", () => {
    const statuses = sectionStatuses({ ...emptyDraft, confirmedSections: [2] }, 0);
    expect(statuses[1]?.complete).toBe(false);
    expect(statuses[4]?.complete).toBe(false);
  });
});