import { describe, expect, it } from "vitest";
import type { AttachmentSlot, CollectionModel, WargearOption } from "@/generated";
import loadoutDisplayItems from "@/utils/collection/loadoutDisplayItems.ts";

const left: AttachmentSlot = { id: "left-arm", name: "Left Arm", type: "arm" };
const right: AttachmentSlot = { id: "right-arm", name: "Right Arm", type: "arm" };
const knife: WargearOption = {
  id: "knife",
  name: "Plagueknife",
  isDefault: false,
  attachmentSlotIds: [left.id ?? "", right.id ?? ""],
};
const cleaver: WargearOption = {
  id: "cleaver",
  name: "Great Plague Cleaver",
  isDefault: false,
  attachmentSlotIds: [left.id ?? "", right.id ?? ""],
};

function model(options: WargearOption[], selections: CollectionModel["wargearSelections"]): CollectionModel {
  return {
    modelDefinitionId: "def",
    modelDefinition: { id: "def", name: "Plague Marine", attachmentSlots: [left, right], wargearOptions: options },
    wargearSelections: selections,
  };
}

describe("loadoutDisplayItems", () => {
  it("keeps two independent copies of the same weapon as two items", () => {
    const items = loadoutDisplayItems(
      [left, right],
      model(
        [knife],
        [
          { attachmentSlotId: "left-arm", wargearOptionId: "knife" },
          { attachmentSlotId: "right-arm", wargearOptionId: "knife" },
        ],
      ),
      [knife],
    );

    expect(items).toEqual([
      expect.objectContaining({ slotLabel: "Left Arm", wargearLabel: "Plagueknife", linked: false }),
      expect.objectContaining({ slotLabel: "Right Arm", wargearLabel: "Plagueknife", linked: false }),
    ]);
  });

  it("collapses a two-handed weapon onto one linked item", () => {
    const items = loadoutDisplayItems(
      [left, right],
      model(
        [cleaver],
        [
          { attachmentSlotId: "left-arm", wargearOptionId: "cleaver", linkGroupId: "g" },
          { attachmentSlotId: "right-arm", wargearOptionId: "cleaver", linkGroupId: "g" },
        ],
      ),
      [cleaver],
    );

    expect(items).toEqual([
      expect.objectContaining({
        slotLabel: "Left Arm + Right Arm",
        wargearLabel: "Great Plague Cleaver",
        linked: true,
      }),
    ]);
  });
});
