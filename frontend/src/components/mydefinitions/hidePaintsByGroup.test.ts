import { describe, expect, it } from "vitest";
import {
  NONE_PAINT_GROUP,
  paintBrandKey,
  paintBrandOptions,
  paintGroupIds,
  paintsInBrand,
  paintsInType,
  paintTypeKey,
  paintTypeOptions,
} from "@/components/mydefinitions/hidePaintsByGroup";
import type { Paint } from "@/generated";

function paint(overrides: Partial<Paint> & Pick<Paint, "name">): Paint {
  return overrides;
}

const citadelBase = paint({ id: "1", name: "Leadbelcher", brand: "Citadel", paintType: "BASE" });
const citadelShade = paint({ id: "2", name: "Nuln Oil", brand: "Citadel", paintType: "SHADE", hidden: true });
const vallejoLayer = paint({ id: "3", name: "Black", brand: "Vallejo", paintType: "LAYER" });
const unbranded = paint({ id: "4", name: "Mix", brand: "  " });

describe("hide paints by group", () => {
  it("treats a blank brand as the no-brand group", () => {
    expect(paintBrandKey(unbranded)).toBe(NONE_PAINT_GROUP);
    expect(paintBrandKey(citadelBase)).toBe("Citadel");
  });

  it("lists brands and types that actually appear, plus a none option when needed", () => {
    const paints = [citadelBase, vallejoLayer, unbranded];

    expect(paintBrandOptions(paints).map((option) => option.label)).toEqual(["Citadel", "Vallejo", "No brand"]);
    expect(paintTypeOptions(paints).map((option) => option.value)).toEqual(["BASE", "LAYER", NONE_PAINT_GROUP]);
  });

  it("collects every paint in a brand or type, including ones already hidden", () => {
    const paints = [citadelBase, citadelShade, vallejoLayer];

    expect(paintsInBrand(paints, "Citadel").map((item) => item.name)).toEqual(["Leadbelcher", "Nuln Oil"]);
    expect(paintsInType(paints, "SHADE").map((item) => item.name)).toEqual(["Nuln Oil"]);
  });

  it("splits a group into ids still offered and ids already hidden", () => {
    const citadel = [citadelBase, citadelShade];

    expect(paintGroupIds(citadel, false)).toEqual(["1"]);
    expect(paintGroupIds(citadel, true)).toEqual(["2"]);
  });

  it("treats a missing type as the no-type group", () => {
    expect(paintTypeKey(unbranded)).toBe(NONE_PAINT_GROUP);
  });
});
