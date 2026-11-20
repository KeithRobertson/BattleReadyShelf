import { describe, expect, it } from "vitest";
import { includeFlagsForRequest, optionApplies } from "@/utils/collectionExport/exportOptions";

describe("optionApplies", () => {
  it("applies thumbnails only for HTML and every miniature", () => {
    expect(optionApplies("thumbnails", "html", "every")).toBe(true);
    expect(optionApplies("thumbnails", "html", "summary")).toBe(false);
    expect(optionApplies("thumbnails", "json", "every")).toBe(false);
    expect(optionApplies("thumbnails", "markdown", "every")).toBe(false);
  });

  it("applies status history only for JSON or every miniature", () => {
    expect(optionApplies("statusHistory", "json", "summary")).toBe(true);
    expect(optionApplies("statusHistory", "html", "every")).toBe(true);
    expect(optionApplies("statusHistory", "markdown", "every")).toBe(true);
    expect(optionApplies("statusHistory", "html", "summary")).toBe(false);
    expect(optionApplies("statusHistory", "markdown", "summary")).toBe(false);
  });

  it("always applies spare bits for format and detail (wargear gates the request)", () => {
    expect(optionApplies("spareBits", "json", "summary")).toBe(true);
    expect(optionApplies("spareBits", "html", "every")).toBe(true);
  });
});

describe("includeFlagsForRequest", () => {
  const allOn = {
    collectionDescription: true,
    faction: true,
    status: true,
    statusHistory: true,
    wargear: true,
    spareBits: true,
    paintRecipes: true,
    miniatureDetails: true,
    thumbnails: true,
  };

  it("forces inapplicable options to false even when checkboxes are true", () => {
    expect(
      includeFlagsForRequest({
        format: "html",
        detail: "summary",
        include: allOn,
      }),
    ).toEqual({
      collectionDescription: true,
      faction: true,
      status: true,
      statusHistory: false,
      wargear: true,
      spareBits: true,
      paintRecipes: true,
      miniatureDetails: false,
      thumbnails: false,
    });
  });

  it("forces status history off when status is off", () => {
    expect(
      includeFlagsForRequest({
        format: "json",
        detail: "every",
        include: { ...allOn, status: false },
      }).statusHistory,
    ).toBe(false);
  });

  it("forces spare bits off when wargear is off", () => {
    expect(
      includeFlagsForRequest({
        format: "json",
        detail: "every",
        include: { ...allOn, wargear: false },
      }).spareBits,
    ).toBe(false);
  });
});
