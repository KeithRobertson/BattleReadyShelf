import { describe, expect, it } from "vitest";
import { countMineOrigins, countPickerVisibility } from "@/components/mydefinitions/personalCatalogueStats";

describe("personal catalogue stats", () => {
  it("splits yours into invented rows and forks of shared ones", () => {
    expect(
      countMineOrigins(
        [{ baseId: "s1" }, { baseId: null }, { baseId: undefined }, { baseId: "s2" }],
        (item) => item.baseId,
      ),
    ).toEqual([
      { key: "own", label: "Your own", count: 2 },
      { key: "customised", label: "Customised", count: 2 },
    ]);
  });

  it("counts hidden vs still in pickers across yours and uncustomised shared rows", () => {
    expect(
      countPickerVisibility([{ hidden: true }, { hidden: false }, {}], [{ hidden: true }, { hidden: false }]),
    ).toEqual([
      { key: "offered", label: "In pickers", count: 3 },
      { key: "hidden", label: "Hidden", count: 2 },
    ]);
  });
});
