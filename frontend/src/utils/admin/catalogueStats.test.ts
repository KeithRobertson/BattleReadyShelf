import { describe, expect, it } from "vitest";
import type { Paint } from "@/generated";
import {
  countByFaction,
  countDraftStatuses,
  countFactionParents,
  countUsersByRole,
  duplicateNames,
  paintBrandCounts,
  paintTypeCounts,
  unusedCount,
} from "@/utils/admin/catalogueStats";
import type { DraftDiff } from "@/utils/modelDefinitionDraftDiff";

function paint(overrides: Partial<Paint> & Pick<Paint, "name">): Paint {
  return overrides;
}

function diff(overrides: Partial<DraftDiff>): DraftDiff {
  return {
    isNew: false,
    details: [],
    attachmentSlots: [],
    wargearOptions: [],
    changeCount: 0,
    ...overrides,
  };
}

describe("catalogue stats", () => {
  it("counts every role, including ones nobody currently has", () => {
    expect(countUsersByRole([{ role: "USER" }, { role: "USER" }, { role: "ADMIN" }, { role: "SUPERADMIN" }])).toEqual([
      { key: "GUEST", label: "GUEST", count: 0 },
      { key: "USER", label: "USER", count: 2 },
      { key: "ADMIN", label: "ADMIN", count: 1 },
      { key: "SUPERADMIN", label: "SUPERADMIN", count: 1 },
    ]);
  });

  it("splits factions into top-level and nested", () => {
    expect(
      countFactionParents([{ parentFactionId: null }, { parentFactionId: undefined }, { parentFactionId: "abc" }]),
    ).toEqual([
      { key: "top", label: "Top-level", count: 2 },
      { key: "nested", label: "Nested", count: 1 },
    ]);
  });

  it("groups items by faction name, and keeps unknown ids from colliding with uncategorised", () => {
    const factions = new Map([["f1", { name: "Aeldari" }]]);
    expect(countByFaction([{ factionId: "f1" }, { factionId: "f1" }, { factionId: "missing" }, {}], factions)).toEqual([
      { key: "f1", label: "Aeldari", count: 2 },
      { key: "missing", label: "missing", count: 1 },
      { key: "__none__", label: "Uncategorised", count: 1 },
    ]);
  });

  it("summarises drafts as new, changed, or unchanged, omitting empty buckets", () => {
    expect(
      countDraftStatuses([
        diff({ isNew: true, changeCount: 3 }),
        diff({ changeCount: 2 }),
        diff({ changeCount: 0 }),
        undefined,
      ]),
    ).toEqual([
      { key: "new", label: "New", count: 1 },
      { key: "changed", label: "With changes", count: 1 },
      { key: "unchanged", label: "No changes", count: 1 },
    ]);
  });

  it("counts unused definitions as those with a zero or missing usage", () => {
    expect(unusedCount([{ usageCount: 0 }, { usageCount: 2 }, {}])).toBe(2);
  });

  it("lists duplicate names once, keeping the first casing it saw", () => {
    expect(duplicateNames([{ name: "Sword" }, { name: "sword" }, { name: "Axe" }, { name: "Sword" }])).toEqual([
      "Sword",
    ]);
  });

  it("counts paints by brand and type, with a bucket for the ones that have neither", () => {
    const paints = [
      paint({ name: "Leadbelcher", brand: "Citadel", paintType: "BASE" }),
      paint({ name: "Nuln Oil", brand: "Citadel", paintType: "SHADE" }),
      paint({ name: "Mix", brand: "  " }),
    ];

    expect(paintBrandCounts(paints)).toEqual([
      { key: "Citadel", label: "Citadel", count: 2 },
      { key: "__none__", label: "No brand", count: 1 },
    ]);
    expect(paintTypeCounts(paints)).toEqual([
      { key: "BASE", label: "Base", count: 1 },
      { key: "__none__", label: "No type", count: 1 },
      { key: "SHADE", label: "Shade", count: 1 },
    ]);
  });
});
