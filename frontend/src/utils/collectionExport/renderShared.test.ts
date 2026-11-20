import { describe, expect, it } from "vitest";
import { formatLoadoutItems } from "@/utils/collectionExport/renderShared";

describe("formatLoadoutItems", () => {
  it("includes spares alongside equipped wargear on magnetised slots", () => {
    const label = formatLoadoutItems([
      {
        slots: ["Right hand"],
        wargear: "Boltgun",
        spares: ["Knife", "Pistol"],
        custom: false,
      },
      { slots: ["Left hand"], wargear: "Plague knife", custom: false },
    ]);

    expect(label).toBe("Boltgun (spares: Knife, Pistol), Plague knife");
  });

  it("formats spare-only entries when wargear is null", () => {
    const label = formatLoadoutItems([
      { slots: ["Backpack"], wargear: null, spares: ["Fuel canister"], custom: false },
    ]);

    expect(label).toBe("spares: Fuel canister");
  });
});
