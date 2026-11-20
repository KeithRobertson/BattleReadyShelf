import { describe, expect, it } from "vitest";
import type { CollectionExportLoadoutEntry, CollectionExportModelType } from "@/generated";
import { summariseModelType } from "@/utils/collectionExport/summariseModelType";

function entry(
  partial: Partial<CollectionExportLoadoutEntry> & Pick<CollectionExportLoadoutEntry, "slots">,
): CollectionExportLoadoutEntry {
  return {
    custom: false,
    ...partial,
  };
}

function modelType(loadouts: Array<CollectionExportLoadoutEntry[] | undefined>): CollectionExportModelType {
  return {
    name: "Plague Marine",
    modelCount: loadouts.length,
    miniatures: loadouts.map((loadout) => ({ loadout })),
  };
}

describe("summariseModelType", () => {
  it("groups two identical loadouts into one group with count 2", () => {
    const boltgun = entry({ slots: ["Right hand"], wargear: "Boltgun" });
    const result = summariseModelType(modelType([[boltgun], [boltgun]]));

    expect(result.loadoutGroups).toEqual([{ count: 2, loadout: [boltgun] }]);
  });

  it("keeps different loadouts in separate groups", () => {
    const boltgun = entry({ slots: ["Right hand"], wargear: "Boltgun" });
    const plagueKnife = entry({ slots: ["Left hand"], wargear: "Plague knife" });
    const result = summariseModelType(modelType([[boltgun], [plagueKnife]]));

    expect(result.loadoutGroups).toEqual([
      { count: 1, loadout: [boltgun] },
      { count: 1, loadout: [plagueKnife] },
    ]);
  });

  it("preserves first-occurrence order of loadout groups", () => {
    const spear = entry({ slots: ["Both hands"], wargear: "Plague spewer" });
    const boltgun = entry({ slots: ["Right hand"], wargear: "Boltgun" });
    const result = summariseModelType(modelType([[spear], [boltgun], [spear]]));

    expect(result.loadoutGroups.map((group) => group.loadout[0]?.wargear)).toEqual([
      "Plague spewer",
      "Boltgun",
    ]);
    expect(result.loadoutGroups.map((group) => group.count)).toEqual([2, 1]);
  });

  it("treats loadouts equal when slots and spares differ only by order", () => {
    const a = entry({
      slots: ["Left hand", "Right hand"],
      wargear: "Plague spewer",
      spares: ["Blight launcher", "Boltgun"],
    });
    const b = entry({
      slots: ["Right hand", "Left hand"],
      wargear: "Plague spewer",
      spares: ["Boltgun", "Blight launcher"],
    });
    const result = summariseModelType(modelType([[a], [b]]));

    expect(result.loadoutGroups).toHaveLength(1);
    expect(result.loadoutGroups[0]?.count).toBe(2);
  });
});
