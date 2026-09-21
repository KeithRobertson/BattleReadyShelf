import { describe, expect, it } from "vitest";
import type { CollectionModel, WargearOption } from "@/generated";
import applyWargearSelection, { applyLoadoutChange } from "@/utils/collection/applyWargearSelection.ts";
import wargearNamesOnModel from "@/utils/collection/wargearNamesOnModel.ts";
import {
  CUSTOM_WARGEAR_VALUE,
  newOptionValue,
  pickerValueToUpdate,
  sameAsValue,
  wargearPickerData,
  wargearPickerValue,
} from "@/utils/collection/wargearSlotPicker.ts";

const left = "left-arm";
const right = "right-arm";
const extra = "arm-3";

function option(id: string, name: string, slotIds: string[]): WargearOption {
  return { id, name, isDefault: false, attachmentSlotIds: slotIds };
}

function model(options: WargearOption[], selections: CollectionModel["wargearSelections"]): CollectionModel {
  return {
    modelDefinitionId: "def",
    modelDefinition: {
      id: "def",
      name: "Plague Marine",
      attachmentSlots: [
        { id: left, name: "Left Arm", type: "arm" },
        { id: right, name: "Right Arm", type: "arm" },
        { id: extra, name: "Third Arm", type: "arm" },
      ],
      wargearOptions: options,
    },
    wargearSelections: selections,
  };
}

const cleaver = option("cleaver", "Great Plague Cleaver", [left, right, extra]);
const knife = option("knife", "Plagueknife", [left, right]);
const boltgun = option("boltgun", "Boltgun", [left, right]);

describe("applyWargearSelection", () => {
  it("fills only the touched slot when picking a new weapon", () => {
    const next = applyWargearSelection(model([cleaver], []), left, { wargearOptionId: "cleaver" });

    expect(next).toEqual([expect.objectContaining({ attachmentSlotId: left, wargearOptionId: "cleaver" })]);
    expect(next[0]?.linkGroupId).toBeUndefined();
  });

  it("treats two independent fills of the same option as two items", () => {
    const next = applyWargearSelection(model([knife], [{ attachmentSlotId: left, wargearOptionId: "knife" }]), right, {
      wargearOptionId: "knife",
    });

    expect(next).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attachmentSlotId: left, wargearOptionId: "knife" }),
        expect.objectContaining({ attachmentSlotId: right, wargearOptionId: "knife" }),
      ]),
    );
    expect(next.every((s) => s.linkGroupId == null)).toBe(true);
  });

  it("links a slot to an existing fill as one item", () => {
    const next = applyWargearSelection(
      model([boltgun], [{ attachmentSlotId: left, wargearOptionId: "boltgun" }]),
      right,
      { sameAsSlotId: left },
    );

    expect(next).toHaveLength(2);
    expect(next.every((s) => s.wargearOptionId === "boltgun")).toBe(true);
    expect(new Set(next.map((s) => s.linkGroupId)).size).toBe(1);
    expect(next[0]?.linkGroupId).toBeDefined();
  });

  it("links a custom label the same way as a catalogue option", () => {
    const next = applyWargearSelection(
      model([], [{ attachmentSlotId: left, customLabel: "Kitbashed thunderhammer" }]),
      right,
      { sameAsSlotId: left },
    );

    expect(next.every((s) => s.customLabel === "Kitbashed thunderhammer")).toBe(true);
    expect(new Set(next.map((s) => s.linkGroupId)).size).toBe(1);
  });

  it("breaks a two-handed group when one hand is changed to a new weapon", () => {
    const group = "group-1";
    const next = applyWargearSelection(
      model(
        [cleaver, knife],
        [
          { attachmentSlotId: left, wargearOptionId: "cleaver", linkGroupId: group },
          { attachmentSlotId: right, wargearOptionId: "cleaver", linkGroupId: group },
        ],
      ),
      right,
      { wargearOptionId: "knife" },
    );

    expect(next.find((s) => s.attachmentSlotId === left)).toEqual(
      expect.objectContaining({ wargearOptionId: "cleaver" }),
    );
    expect(next.find((s) => s.attachmentSlotId === left)?.linkGroupId).toBeUndefined();
    expect(next.find((s) => s.attachmentSlotId === right)).toEqual(
      expect.objectContaining({ wargearOptionId: "knife" }),
    );
    expect(next.find((s) => s.attachmentSlotId === right)?.linkGroupId).toBeUndefined();
  });

  it("joins a third slot onto an existing linked pair", () => {
    const next = applyWargearSelection(
      model(
        [cleaver],
        [
          { attachmentSlotId: left, wargearOptionId: "cleaver", linkGroupId: "first" },
          { attachmentSlotId: right, wargearOptionId: "cleaver", linkGroupId: "first" },
        ],
      ),
      extra,
      { sameAsSlotId: left },
    );

    expect(next.find((s) => s.attachmentSlotId === extra)).toEqual(
      expect.objectContaining({ wargearOptionId: "cleaver", linkGroupId: "first" }),
    );
  });

  it("does not break a group when re-selecting a partner already in it", () => {
    const group = "g";
    const next = applyWargearSelection(
      model(
        [cleaver],
        [
          { attachmentSlotId: left, wargearOptionId: "cleaver", linkGroupId: group },
          { attachmentSlotId: right, wargearOptionId: "cleaver", linkGroupId: group },
        ],
      ),
      left,
      { sameAsSlotId: right },
    );

    expect(next.every((s) => s.linkGroupId === group)).toBe(true);
  });
});

describe("wargearSlotPicker", () => {
  const slots = [
    { id: left, name: "Left Arm", type: "arm" },
    { id: right, name: "Right Arm", type: "arm" },
  ];

  it("groups existing fills separately from new catalogue options", () => {
    const data = wargearPickerData(
      right,
      slots,
      [boltgun, knife],
      model([boltgun, knife], [{ attachmentSlotId: left, wargearOptionId: "boltgun" }]),
    );

    expect(data).toEqual([
      {
        group: "On this model",
        items: [{ value: sameAsValue(left), label: "Same as Left Arm (Boltgun)" }],
      },
      {
        group: "New",
        items: [
          { value: newOptionValue("boltgun"), label: "Boltgun" },
          { value: newOptionValue("knife"), label: "Plagueknife" },
          { value: CUSTOM_WARGEAR_VALUE, label: "Custom..." },
        ],
      },
    ]);
  });

  it("shows a linked non-representative slot as same-as the first grouped slot", () => {
    const current = model(
      [boltgun],
      [
        { attachmentSlotId: left, wargearOptionId: "boltgun", linkGroupId: "g" },
        { attachmentSlotId: right, wargearOptionId: "boltgun", linkGroupId: "g" },
      ],
    );

    expect(wargearPickerValue(right, [left, right], current)).toBe(sameAsValue(left));
    expect(wargearPickerValue(left, [left, right], current)).toBe(newOptionValue("boltgun"));
  });

  it("maps picker values onto new vs same-as updates", () => {
    expect(pickerValueToUpdate(null)).toEqual({ wargearOptionId: null, customLabel: null });
    expect(pickerValueToUpdate(CUSTOM_WARGEAR_VALUE)).toBe("custom");
    expect(pickerValueToUpdate(sameAsValue(left))).toEqual({ sameAsSlotId: left });
    expect(pickerValueToUpdate(newOptionValue("knife"))).toEqual({ wargearOptionId: "knife", customLabel: null });
  });
});

describe("wargearNamesOnModel", () => {
  it("counts a linked two-handed weapon once", () => {
    const names = wargearNamesOnModel(
      model(
        [cleaver],
        [
          { attachmentSlotId: left, wargearOptionId: "cleaver", linkGroupId: "g" },
          { attachmentSlotId: right, wargearOptionId: "cleaver", linkGroupId: "g" },
        ],
      ),
    );
    expect(names).toEqual(["Great Plague Cleaver"]);
  });

  it("counts two one-handed weapons with the same name as two", () => {
    const names = wargearNamesOnModel(
      model(
        [knife],
        [
          { attachmentSlotId: left, wargearOptionId: "knife" },
          { attachmentSlotId: right, wargearOptionId: "knife" },
        ],
      ),
    );
    expect(names).toEqual(["Plagueknife", "Plagueknife"]);
  });

  it("counts two independently placed two-handers as two", () => {
    const names = wargearNamesOnModel(
      model(
        [cleaver],
        [
          { attachmentSlotId: left, wargearOptionId: "cleaver", linkGroupId: "a" },
          { attachmentSlotId: right, wargearOptionId: "cleaver", linkGroupId: "b" },
        ],
      ),
    );
    expect(names).toEqual(["Great Plague Cleaver", "Great Plague Cleaver"]);
  });

  it("counts unequipped magnetised bits toward inventory", () => {
    const names = wargearNamesOnModel(
      model(
        [boltgun, knife],
        [
          { attachmentSlotId: right, wargearOptionId: "boltgun", equipped: true },
          { attachmentSlotId: right, wargearOptionId: "knife", equipped: false },
        ],
      ),
    );
    expect(names).toEqual(["Boltgun", "Plagueknife"]);
  });
});

describe("applyLoadoutChange magnetisation", () => {
  it("keeps existing bits when a slot is magnetised", () => {
    const current = model([boltgun], [{ attachmentSlotId: right, wargearOptionId: "boltgun" }]);
    const patch = applyLoadoutChange(current, right, { magnetized: true });
    expect(patch.magnetizedSlotIds).toEqual([right]);
    expect(patch.wargearSelections).toEqual([
      expect.objectContaining({ attachmentSlotId: right, wargearOptionId: "boltgun" }),
    ]);
  });

  it("adds a second bit without dropping the first", () => {
    const current = {
      ...model([boltgun, knife], [{ attachmentSlotId: right, wargearOptionId: "boltgun", equipped: true }]),
      magnetizedSlotIds: [right],
    };
    const patch = applyLoadoutChange(current, right, { wargearOptionId: "knife", addBit: true });
    expect(patch.wargearSelections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ attachmentSlotId: right, wargearOptionId: "boltgun", equipped: false }),
        expect.objectContaining({ attachmentSlotId: right, wargearOptionId: "knife", equipped: true }),
      ]),
    );
  });

  it("equips an owned bit without removing the others", () => {
    const current = {
      ...model(
        [boltgun, knife],
        [
          { attachmentSlotId: right, wargearOptionId: "boltgun", equipped: true },
          { attachmentSlotId: right, wargearOptionId: "knife", equipped: false },
        ],
      ),
      magnetizedSlotIds: [right],
    };
    const patch = applyLoadoutChange(current, right, { equipKey: "opt:knife" });
    expect(patch.wargearSelections.find((s) => s.wargearOptionId === "knife")?.equipped).toBe(true);
    expect(patch.wargearSelections.find((s) => s.wargearOptionId === "boltgun")?.equipped).toBe(false);
  });
});
