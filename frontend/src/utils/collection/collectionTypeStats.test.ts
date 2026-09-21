import { describe, expect, it } from "vitest";
import type { CollectionModel } from "@/generated";
import { formatTypeCount, modelMatchesTypeFilter, typeCounts } from "@/utils/collection/collectionTypeStats.ts";

function guo(): CollectionModel {
  return {
    modelDefinitionId: "guo",
    modelDefinition: { id: "guo", name: "Great Unclean One" },
    alternateModelDefinitionIds: ["rotigus"],
    alternateModelDefinitions: [{ id: "rotigus", name: "Rotigus" }],
  };
}

describe("collectionTypeStats", () => {
  it("counts a shared miniature towards each identity's maximum", () => {
    expect(typeCounts([guo()], ["guo", "rotigus"])).toEqual([
      { key: "guo", label: "Great Unclean One", current: 1, max: 1 },
      { key: "rotigus", label: "Rotigus", current: 0, max: 1 },
    ]);
  });

  it("formats a range only when current and max differ", () => {
    expect(formatTypeCount({ key: "guo", label: "Great Unclean One", current: 1, max: 1 })).toBe("1");
    expect(formatTypeCount({ key: "rotigus", label: "Rotigus", current: 0, max: 1 })).toBe("0–1");
  });

  it("matches a type filter against any identity", () => {
    expect(modelMatchesTypeFilter(guo(), ["rotigus"])).toBe(true);
    expect(modelMatchesTypeFilter(guo(), ["plague-marine"])).toBe(false);
  });
});
