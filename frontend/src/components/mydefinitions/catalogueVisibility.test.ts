import { describe, expect, it } from "vitest";
import {
  bulkHiddenIntent,
  isHidden,
  markHidden,
  matchesSearch,
  matchesVisibility,
} from "@/components/mydefinitions/catalogueVisibility";

describe("catalogue visibility", () => {
  it("treats missing hidden as offered, not hidden", () => {
    expect(isHidden({})).toBe(false);
    expect(isHidden({ hidden: false })).toBe(false);
    expect(isHidden({ hidden: true })).toBe(true);
  });

  it("filters by whether the row is still offered in pickers", () => {
    const hidden = { hidden: true };
    const offered = { hidden: false };

    expect(matchesVisibility(hidden, "all")).toBe(true);
    expect(matchesVisibility(offered, "all")).toBe(true);
    expect(matchesVisibility(hidden, "in-pickers")).toBe(false);
    expect(matchesVisibility(offered, "in-pickers")).toBe(true);
    expect(matchesVisibility(hidden, "hidden")).toBe(true);
    expect(matchesVisibility(offered, "hidden")).toBe(false);
  });

  it("matches a name without regard to surrounding case or spare spaces", () => {
    expect(matchesSearch("Leadbelcher", "  lead ")).toBe(true);
    expect(matchesSearch("Leadbelcher", "gold")).toBe(false);
    expect(matchesSearch("Leadbelcher", "")).toBe(true);
  });

  it("marks only the named ids as hidden or shown", () => {
    const items = [
      { id: "a", hidden: false },
      { id: "b", hidden: false },
    ];

    expect(markHidden(items, new Set(["b"]), true)).toEqual([
      { id: "a", hidden: false },
      { id: "b", hidden: true },
    ]);
  });

  it("hides whatever is still offered, and shows when every listed row is already hidden", () => {
    expect(bulkHiddenIntent([{ id: "a" }, { id: "b", hidden: true }])).toEqual({ ids: ["a"], hidden: true });
    expect(
      bulkHiddenIntent([
        { id: "a", hidden: true },
        { id: "b", hidden: true },
      ]),
    ).toEqual({
      ids: ["a", "b"],
      hidden: false,
    });
    expect(bulkHiddenIntent([])).toBeNull();
  });
});
